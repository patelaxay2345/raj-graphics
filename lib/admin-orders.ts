import { and, count, desc, eq, exists, gte, inArray, like, lt, or, sql, sum, type SQL } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import type { Db } from "@/db";
import { counters, customers, orderItems, orders } from "@/db/schema";
import { AdminError } from "@/lib/admin-categories";
import { GSTIN_RE } from "@/lib/gst";
import { DELIVERY, DESIGN_BY, GST_RATES, PAY_MODES, PROOF_BY, SERVICES, UNITS, normalizePhone, toPaise, totals, type ServiceId } from "@/lib/order-format";

const text = (maxLen: number) => z.string().trim().max(maxLen);
const keys = <T extends readonly (readonly [string, string])[]>(list: T) => list.map(([k]) => k) as [T[number][0], ...T[number][0][]];
export const money = (label: string, max: number) =>
  z.string().transform((v, ctx) => {
    const p = v.trim() === "" ? 0 : toPaise(v);
    if (p === null || p > max) ctx.addIssue({ code: "custom", message: `${label}: enter rupees, e.g. 650 or 0.65` });
    return p ?? 0;
  });

export const gstinSchema = z.string().trim().toUpperCase().refine((v) => v === "" || GSTIN_RE.test(v), "GSTIN should be 15 characters, e.g. 24ABCDE1234F1Z5");

const customerSchema = z.object({
  phone: z.string().transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) ctx.addIssue({ code: "custom", message: "Enter a valid phone number" });
    return p ?? "";
  }),
  name: text(80).min(1, "Customer name is required"),
  business: text(120),
  gstin: gstinSchema,
  city: text(60),
  address: text(300),
});

const itemSchema = z
  .object({
    service: z.enum(SERVICES.map((s) => s.id) as [ServiceId, ...ServiceId[]]),
    specs: z.record(z.string(), z.string()),
    qty: z.string().trim().regex(/^\d{1,7}$/, "Quantity must be a whole number").transform(Number).pipe(z.number().min(1, "Quantity must be at least 1").max(1_000_000)),
    unit: z.enum(UNITS as [string, ...string[]]),
    rate: money("Rate", 100_000_000),
    hsn: text(8).regex(/^\d*$/, "HSN / SAC is digits only"),
  })
  .transform((item, ctx) => {
    const fields = SERVICES.find((s) => s.id === item.service)!.fields;
    const specs: Record<string, string> = {};
    for (const [k, raw] of Object.entries(item.specs)) {
      const f = fields.find((x) => x.key === k);
      const v = raw.trim();
      if (!f) ctx.addIssue({ code: "custom", message: `Unknown detail "${k}"` });
      else if (v.length > (f.long ? 2000 : 120)) ctx.addIssue({ code: "custom", message: `${f.label} is too long` });
      else if (v && f.options && !f.options.includes(v)) ctx.addIssue({ code: "custom", message: `Pick a ${f.label.toLowerCase()} from the list` });
      else if (v) specs[k] = v;
    }
    return { ...item, specs };
  });

export const orderSchema = z
  .object({
    customer: customerSchema,
    items: z.array(itemSchema).min(1, "Add at least one item").max(20),
    dueOn: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Pick a due date").transform((v) => v || null),
    deliveryMode: z.enum(keys(DELIVERY)),
    designBy: z.enum(keys(DESIGN_BY)),
    proofBy: z.enum(keys(PROOF_BY)),
    notes: text(2000),
    gstRate: z.number().refine((r) => GST_RATES.includes(r), "Pick a GST rate"),
    advance: money("Advance", 10_000_000_000),
    payMode: z.enum(["", ...keys(PAY_MODES)]).transform((v) => v || null),
  })
  .transform((o, ctx) => {
    const t = totals(o.items, o.gstRate, o.advance);
    if (o.advance > t.total) ctx.addIssue({ code: "custom", message: "Advance is more than the order total" });
    if (o.advance > 0 && !o.payMode) ctx.addIssue({ code: "custom", message: "Pick how the advance was paid" });
    return { ...o, ...t };
  });

export type OrderInput = z.input<typeof orderSchema>;

const SERIES = "ORD";
const currentNo = sql`(select ${counters.next} - 1 from ${counters} where ${counters.series} = ${SERIES})`;
const customerId = (phone: string) => sql`(select ${customers.id} from ${customers} where ${customers.phone} = ${phone})`;

function upsertCustomer(db: Db, c: z.output<typeof customerSchema>) {
  return db.insert(customers).values(c).onConflictDoUpdate({ target: customers.phone, set: { name: c.name, business: c.business, gstin: c.gstin, city: c.city, address: c.address } });
}

const orderFields = (o: z.output<typeof orderSchema>) => ({
  dueOn: o.dueOn,
  deliveryMode: o.deliveryMode,
  designBy: o.designBy,
  proofBy: o.proofBy,
  notes: o.notes,
  gstRate: o.gstRate,
  subtotal: o.subtotal,
  tax: o.tax,
  total: o.total,
  advance: o.advance,
  payMode: o.payMode,
});

const itemRows = (o: z.output<typeof orderSchema>, orderId: number | SQL) =>
  o.items.map((i, sort) => ({ orderId, service: i.service, specs: i.specs, qty: i.qty, unit: i.unit, rate: i.rate, hsn: i.hsn, sort }));

export async function createOrder(db: Db, input: OrderInput) {
  const o = orderSchema.parse(input);
  const [, , [row]] = await db.batch([
    upsertCustomer(db, o.customer),
    db.insert(counters).values({ series: SERIES, next: 2 }).onConflictDoUpdate({ target: counters.series, set: { next: sql`${counters.next} + 1` } }),
    db.insert(orders).values({ ...orderFields(o), no: currentNo, customerId: customerId(o.customer.phone) }).returning({ id: orders.id, no: orders.no }),
    db.insert(orderItems).values(itemRows(o, sql`(select ${orders.id} from ${orders} where ${orders.no} = ${currentNo})`)),
  ]);
  return row;
}

export async function updateOrder(db: Db, id: number, input: OrderInput) {
  const o = orderSchema.parse(input);
  if (!(await db.$count(orders, eq(orders.id, id)))) throw new AdminError("Order not found");
  await db.batch([
    upsertCustomer(db, o.customer),
    db.update(orders).set({ ...orderFields(o), customerId: customerId(o.customer.phone), updatedAt: new Date() }).where(eq(orders.id, id)),
    db.delete(orderItems).where(eq(orderItems.orderId, id)),
    db.insert(orderItems).values(itemRows(o, id)),
  ]);
}

export async function setOrderStatus(db: Db, id: number, done: boolean) {
  const [row] = await db
    .update(orders)
    .set({ status: done ? "done" : "pending", doneAt: done ? new Date() : null, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning({ id: orders.id });
  if (!row) throw new AdminError("Order not found");
}

export const findCustomer = async (db: Db, phone: string) => {
  const p = normalizePhone(phone);
  return p ? db.query.customers.findFirst({ where: eq(customers.phone, p) }) : undefined;
};

export const getOrder = (db: Db, id: number) =>
  db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      customer: true,
      items: { orderBy: (t, { asc }) => [asc(t.sort), asc(t.id)] },
      invoices: { columns: { id: true, fy: true, seq: true } },
      challans: { columns: { id: true, fy: true, seq: true }, orderBy: (t, { asc }) => [asc(t.id)] },
    },
  });

export type OrderTab = "pending" | "unpaid" | "done" | "all";

const TAB: Record<OrderTab, SQL | undefined> = {
  pending: eq(orders.status, "pending"),
  unpaid: lt(orders.advance, orders.total),
  done: eq(orders.status, "done"),
  all: undefined,
};

const IST_MS = 330 * 60_000;

export const istToday = (now = Date.now()) => new Date(now + IST_MS).toISOString().slice(0, 10);

export const istMonthStart = (now = Date.now()) => {
  const d = new Date(now + IST_MS);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - IST_MS);
};

const whenCount = (cond: SQL) => count(sql`case when ${cond} then 1 end`);

export async function orderStats(db: Db, now = Date.now()) {
  const [s] = await db
    .select({
      pending: whenCount(eq(orders.status, "pending")),
      unpaid: whenCount(lt(orders.advance, orders.total)),
      done: whenCount(eq(orders.status, "done")),
      all: count(),
      dueToday: whenCount(and(eq(orders.status, "pending"), eq(orders.dueOn, istToday(now)))!),
      doneThisMonth: whenCount(and(eq(orders.status, "done"), gte(orders.doneAt, istMonthStart(now)))!),
      balance: sum(sql`case when ${orders.advance} < ${orders.total} then ${orders.total} - ${orders.advance} else 0 end`).mapWith(Number),
    })
    .from(orders);
  return { ...s, balance: s.balance ?? 0 };
}

export const LIST_LIMIT = 200;

export function listOrders(db: Db, tab: OrderTab, q: string) {
  const needle = q.trim();
  const pattern = `%${needle.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const matchText = (col: AnySQLiteColumn) => sql`${col} like ${pattern} escape '\\'`;
  const services = SERVICES.filter((s) => s.label.toLowerCase().includes(needle.toLowerCase())).map((s) => s.id);
  const no = needle.match(/^(?:ord-?)?0*(\d{1,9})$/i);
  const search = needle
    ? or(
        no ? eq(orders.no, Number(no[1])) : undefined,
        inArray(
          orders.customerId,
          db.select({ id: customers.id }).from(customers).where(or(matchText(customers.name), matchText(customers.business), like(customers.phone, `%${needle.replace(/\D/g, "") || "-"}%`))),
        ),
        exists(db.select({ x: sql`1` }).from(orderItems).where(and(eq(orderItems.orderId, orders.id), or(matchText(orderItems.specs), services.length ? inArray(orderItems.service, services) : undefined)))),
      )
    : undefined;

  return db.query.orders.findMany({
    where: and(TAB[tab], search),
    with: { customer: true, items: { orderBy: (t, { asc }) => [asc(t.sort), asc(t.id)] }, invoices: { columns: { id: true, fy: true, seq: true } } },
    orderBy: desc(orders.no),
    limit: LIST_LIMIT,
  });
}
