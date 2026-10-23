import { and, desc, eq, exists, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { counters, invoiceItems, invoices, orders, type Seller } from "@/db/schema";
import type { InvoiceDocData } from "@/components/invoice-doc";
import { AdminError } from "@/lib/admin-categories";
import { gstinSchema, money } from "@/lib/admin-orders";
import { GSTIN_RE, STATES, financialYear, invoiceNo, invoiceTotals } from "@/lib/gst";
import { GST_RATES, UNITS, jobSummary, orderNo } from "@/lib/order-format";
import { getSeller } from "@/lib/settings";

const text = (maxLen: number) => z.string().trim().max(maxLen);

const lineSchema = z.object({
  description: text(300).min(1, "Every line needs a description"),
  hsn: text(8).regex(/^\d*$/, "HSN / SAC is digits only"),
  qty: z.string().trim().regex(/^\d{1,7}$/, "Quantity must be a whole number").transform(Number).pipe(z.number().min(1, "Quantity must be at least 1").max(1_000_000)),
  unit: z.enum(UNITS as [string, ...string[]]),
  rate: money("Rate", 100_000_000),
});

export const draftSchema = z.object({
  billName: text(120).min(1, "Bill to is required"),
  billGstin: gstinSchema,
  billAddress: text(400),
  placeOfSupply: z.string().refine((c) => STATES.some(([s]) => s === c), "Pick the place of supply"),
  gstRate: z.number().refine((r) => GST_RATES.includes(r), "Pick a GST rate"),
  advance: money("Advance", 10_000_000_000),
  note: text(300),
  items: z.array(lineSchema).min(1, "Add at least one line").max(30),
});

export type DraftInput = z.input<typeof draftSchema>;

const compute = (d: { items: { qty: number; rate: number }[]; gstRate: number; placeOfSupply: string }, sellerState: string) =>
  invoiceTotals(d.items, d.gstRate, d.placeOfSupply === sellerState);

export async function createInvoiceFromOrder(db: Db, orderId: number) {
  const existing = await db.query.invoices.findFirst({ where: eq(invoices.orderId, orderId), columns: { id: true } });
  if (existing) return existing.id;
  const o = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { customer: true, items: { orderBy: (t, { asc }) => [asc(t.sort), asc(t.id)] } } });
  if (!o) throw new AdminError("Order not found");
  const seller = await getSeller(db);
  const placeOfSupply = GSTIN_RE.test(o.customer.gstin) && STATES.some(([c]) => c === o.customer.gstin.slice(0, 2)) ? o.customer.gstin.slice(0, 2) : seller.stateCode;
  const items = o.items.map((i, sort) => {
    const { title, spec } = jobSummary(i);
    return { description: (spec ? `${title} – ${spec}` : title).slice(0, 300), hsn: i.hsn, qty: i.qty, unit: i.unit, rate: i.rate, sort };
  });
  const t = compute({ items, gstRate: o.gstRate, placeOfSupply }, seller.stateCode);
  try {
    const [[row]] = await db.batch([
      db
        .insert(invoices)
        .values({
          orderId,
          billName: o.customer.business || o.customer.name,
          billGstin: o.customer.gstin,
          billAddress: [o.customer.address, o.customer.city].filter(Boolean).join(", "),
          placeOfSupply,
          gstRate: o.gstRate,
          ...t,
          advance: Math.min(o.advance, t.total),
        })
        .returning({ id: invoices.id }),
      db.insert(invoiceItems).values(items.map((i) => ({ ...i, invoiceId: sql`(select ${invoices.id} from ${invoices} where ${invoices.orderId} = ${orderId})` }))),
    ]);
    return row.id;
  } catch (e) {
    const again = await db.query.invoices.findFirst({ where: eq(invoices.orderId, orderId), columns: { id: true } });
    if (again) return again.id;
    throw e;
  }
}

async function draftOnly(db: Db, id: number) {
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, id), columns: { status: true } });
  if (!inv) throw new AdminError("Invoice not found");
  if (inv.status !== "draft") throw new AdminError("Issued invoices cannot be changed");
}

export async function updateDraft(db: Db, id: number, input: DraftInput) {
  const d = draftSchema.parse(input);
  await draftOnly(db, id);
  const t = compute(d, (await getSeller(db)).stateCode);
  if (d.advance > t.total) throw new AdminError("Advance is more than the invoice total");
  const draftId = sql`(select ${invoices.id} from ${invoices} where ${invoices.id} = ${id} and ${invoices.status} = 'draft')`;
  await db.batch([
    db.update(invoices).set({ billName: d.billName, billGstin: d.billGstin, billAddress: d.billAddress, placeOfSupply: d.placeOfSupply, gstRate: d.gstRate, advance: d.advance, note: d.note, ...t, updatedAt: new Date() }).where(and(eq(invoices.id, id), eq(invoices.status, "draft"))),
    db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, draftId)),
    db.insert(invoiceItems).values(d.items.map((i, sort) => ({ ...i, invoiceId: draftId, sort }))),
  ]);
}

export async function issueInvoice(db: Db, id: number, today: string) {
  const seller = await getSeller(db);
  if (!GSTIN_RE.test(seller.gstin)) throw new AdminError("Add your GSTIN in Settings → Billing & GST before issuing tax invoices");
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, id), with: { items: true } });
  if (!inv) throw new AdminError("Invoice not found");
  if (inv.status !== "draft") throw new AdminError("This invoice is already issued");
  const t = compute(inv, seller.stateCode);
  if (inv.advance > t.total) throw new AdminError("Advance is more than the invoice total");

  const fy = financialYear(today);
  const series = `INV/${fy}`;
  const isDraft = and(eq(invoices.id, id), eq(invoices.status, "draft"));
  const [, , [row]] = await db.batch([
    db.insert(counters).values({ series, next: 1 }).onConflictDoNothing(),
    db.update(counters).set({ next: sql`${counters.next} + 1` }).where(and(eq(counters.series, series), exists(db.select({ x: sql`1` }).from(invoices).where(isDraft)))),
    db
      .update(invoices)
      .set({ status: "issued", fy, seq: sql`(select ${counters.next} - 1 from ${counters} where ${counters.series} = ${series})`, issuedOn: today, seller, ...t, updatedAt: new Date() })
      .where(isDraft)
      .returning({ fy: invoices.fy, seq: invoices.seq }),
  ]);
  if (!row) throw new AdminError("This invoice is already issued");
  return row as { fy: string; seq: number };
}

export async function setInvoicePaid(db: Db, id: number, paid: boolean) {
  const [row] = await db
    .update(invoices)
    .set({ status: paid ? "paid" : "issued", paidAt: paid ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.status, paid ? "issued" : "paid")))
    .returning({ id: invoices.id });
  if (!row) throw new AdminError(paid ? "Only issued invoices can be marked paid" : "Invoice is not marked paid");
}

export async function deleteDraft(db: Db, id: number) {
  await draftOnly(db, id);
  await db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.status, "draft")));
}

export const getInvoice = (db: Db, id: number) =>
  db.query.invoices.findFirst({
    where: eq(invoices.id, id),
    with: { items: { orderBy: (t, { asc }) => [asc(t.sort), asc(t.id)] }, order: { columns: { id: true, no: true }, with: { customer: { columns: { phone: true } } } } },
  });

export type InvoiceTab = "draft" | "issued" | "paid" | "all";

export const listInvoices = (db: Db, tab: InvoiceTab) =>
  db.query.invoices.findMany({
    where: tab === "all" ? undefined : eq(invoices.status, tab),
    with: { order: { columns: { id: true, no: true } } },
    orderBy: [desc(sql`${invoices.issuedOn} is null`), desc(invoices.issuedOn), desc(invoices.seq), desc(invoices.id)],
    limit: 200,
  });

type LoadedInvoice = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;

export const invoiceLabel = (i: { fy: string | null; seq: number | null }) => (i.fy && i.seq ? invoiceNo(i.fy, i.seq) : null);

export const docData = (i: LoadedInvoice, current: Seller): InvoiceDocData => ({
  no: invoiceLabel(i),
  issuedOn: i.issuedOn,
  orderNo: orderNo(i.order.no),
  seller: i.seller ?? current,
  billName: i.billName,
  billGstin: i.billGstin,
  billAddress: i.billAddress,
  placeOfSupply: i.placeOfSupply,
  gstRate: i.gstRate,
  advance: i.advance,
  note: i.note,
  items: i.items,
});
