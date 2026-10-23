import { and, desc, eq, exists, sql } from "drizzle-orm";
import { z } from "zod";
import type { ChallanDocData } from "@/components/challan-doc";
import type { Db } from "@/db";
import { challanItems, challans, counters, orders, type Seller } from "@/db/schema";
import { AdminError } from "@/lib/admin-categories";
import { financialYear } from "@/lib/gst";
import { DELIVERY, UNITS, jobSummary, orderNo, showPhone } from "@/lib/order-format";
import { getSeller } from "@/lib/settings";

export const PURPOSES = [["supply", "Supply on order"], ["job-work", "Job work return"], ["sample", "Sample / approval"], ["part", "Part delivery"]] as const;

const text = (maxLen: number) => z.string().trim().max(maxLen);
const keys = <T extends readonly (readonly [string, string])[]>(list: T) => list.map(([k]) => k) as [T[number][0], ...T[number][0][]];

export const challanSchema = z.object({
  deliverTo: text(120).min(1, "Deliver to is required"),
  phone: text(40),
  address: text(400),
  mode: z.enum(keys(DELIVERY)),
  vehicle: text(80),
  purpose: z.enum(keys(PURPOSES)),
  returnable: z.boolean(),
  items: z
    .array(
      z.object({
        description: text(300).min(1, "Every item needs a description"),
        qty: z.string().trim().regex(/^\d{1,7}$/, "Quantity must be a whole number").transform(Number).pipe(z.number().min(1, "Quantity must be at least 1").max(1_000_000)),
        unit: z.enum(UNITS as [string, ...string[]]),
        packing: text(80),
      }),
    )
    .min(1, "Add at least one item")
    .max(30),
});

export type ChallanInput = z.input<typeof challanSchema>;

export const challanNo = (fy: string, seq: number) => `DC/${fy}/${String(seq).padStart(4, "0")}`;
export const challanLabel = (c: { fy: string | null; seq: number | null }) => (c.fy && c.seq ? challanNo(c.fy, c.seq) : null);

export async function createChallanFromOrder(db: Db, orderId: number) {
  const o = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { customer: true, items: { orderBy: (t, { asc }) => [asc(t.sort), asc(t.id)] } } });
  if (!o) throw new AdminError("Order not found");
  const [[row]] = await db.batch([
    db
      .insert(challans)
      .values({
        orderId,
        deliverTo: o.customer.business || o.customer.name,
        phone: showPhone(o.customer.phone),
        address: [o.customer.address, o.customer.city].filter(Boolean).join(", "),
        mode: o.deliveryMode,
      })
      .returning({ id: challans.id }),
    db.insert(challanItems).values(
      o.items.map((i, sort) => {
        const { title, spec } = jobSummary(i);
        return { challanId: sql`(select max(${challans.id}) from ${challans} where ${challans.orderId} = ${orderId})`, description: (spec ? `${title} – ${spec}` : title).slice(0, 300), qty: i.qty, unit: i.unit, sort };
      }),
    ),
  ]);
  return row.id;
}

export async function updateChallanDraft(db: Db, id: number, input: ChallanInput) {
  const c = challanSchema.parse(input);
  const current = await db.query.challans.findFirst({ where: eq(challans.id, id), columns: { status: true } });
  if (!current) throw new AdminError("Challan not found");
  if (current.status !== "draft") throw new AdminError("Issued challans cannot be changed");
  const draftId = sql`(select ${challans.id} from ${challans} where ${challans.id} = ${id} and ${challans.status} = 'draft')`;
  const { items, ...fields } = c;
  await db.batch([
    db.update(challans).set({ ...fields, updatedAt: new Date() }).where(and(eq(challans.id, id), eq(challans.status, "draft"))),
    db.delete(challanItems).where(eq(challanItems.challanId, draftId)),
    db.insert(challanItems).values(items.map((i, sort) => ({ ...i, challanId: draftId, sort }))),
  ]);
}

export async function issueChallan(db: Db, id: number, today: string) {
  const current = await db.query.challans.findFirst({ where: eq(challans.id, id), columns: { status: true } });
  if (!current) throw new AdminError("Challan not found");
  if (current.status !== "draft") throw new AdminError("This challan is already issued");
  const seller = await getSeller(db);
  const fy = financialYear(today);
  const series = `DC/${fy}`;
  const isDraft = and(eq(challans.id, id), eq(challans.status, "draft"));
  const [, , [row]] = await db.batch([
    db.insert(counters).values({ series, next: 1 }).onConflictDoNothing(),
    db.update(counters).set({ next: sql`${counters.next} + 1` }).where(and(eq(counters.series, series), exists(db.select({ x: sql`1` }).from(challans).where(isDraft)))),
    db
      .update(challans)
      .set({ status: "issued", fy, seq: sql`(select ${counters.next} - 1 from ${counters} where ${counters.series} = ${series})`, issuedOn: today, seller, updatedAt: new Date() })
      .where(isDraft)
      .returning({ fy: challans.fy, seq: challans.seq }),
  ]);
  if (!row) throw new AdminError("This challan is already issued");
  return row as { fy: string; seq: number };
}

export async function setChallanDelivered(db: Db, id: number, delivered: boolean) {
  const [row] = await db
    .update(challans)
    .set({ status: delivered ? "delivered" : "issued", deliveredAt: delivered ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(challans.id, id), eq(challans.status, delivered ? "issued" : "delivered")))
    .returning({ id: challans.id });
  if (!row) throw new AdminError(delivered ? "Only issued challans can be marked delivered" : "Challan is not marked delivered");
}

export async function deleteChallanDraft(db: Db, id: number) {
  const [row] = await db.delete(challans).where(and(eq(challans.id, id), eq(challans.status, "draft"))).returning({ id: challans.id });
  if (!row) throw new AdminError("Only draft challans can be deleted");
}

export const getChallan = (db: Db, id: number) =>
  db.query.challans.findFirst({
    where: eq(challans.id, id),
    with: { items: { orderBy: (t, { asc }) => [asc(t.sort), asc(t.id)] }, order: { columns: { id: true, no: true } } },
  });

export type ChallanTab = "draft" | "issued" | "delivered" | "all";

export const listChallans = (db: Db, tab: ChallanTab) =>
  db.query.challans.findMany({
    where: tab === "all" ? undefined : eq(challans.status, tab),
    with: { order: { columns: { id: true, no: true } }, items: { orderBy: (t, { asc }) => [asc(t.sort), asc(t.id)] } },
    orderBy: [desc(sql`${challans.issuedOn} is null`), desc(challans.issuedOn), desc(challans.seq), desc(challans.id)],
    limit: 200,
  });

type LoadedChallan = NonNullable<Awaited<ReturnType<typeof getChallan>>>;

export const challanDocData = (c: LoadedChallan, current: Seller): ChallanDocData => ({
  no: challanLabel(c),
  issuedOn: c.issuedOn,
  orderNo: orderNo(c.order.no),
  seller: c.seller ?? current,
  deliverTo: c.deliverTo,
  phone: c.phone,
  address: c.address,
  vehicle: c.vehicle,
  purpose: PURPOSES.find(([k]) => k === c.purpose)![1],
  returnable: c.returnable,
  items: c.items,
});
