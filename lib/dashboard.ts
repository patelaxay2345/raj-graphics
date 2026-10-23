import { count, desc, eq, sql, sum } from "drizzle-orm";
import type { Db } from "@/db";
import { challans, enquiries, invoices, orders } from "@/db/schema";
import { orderStats } from "@/lib/admin-orders";
import { GSTIN_RE } from "@/lib/gst";
import { PLACEHOLDER_WA, getSeller, getStore } from "@/lib/settings";

export async function dashboard(db: Db, opts: { turnstile: boolean; now?: number }) {
  const [stats, [enq], [inv], [dc], recentEnquiries, recentOrders, store, seller] = await Promise.all([
    orderStats(db, opts.now),
    db.select({ fresh: count() }).from(enquiries).where(eq(enquiries.status, "new")),
    db.select({ n: count(), due: sum(sql`${invoices.total} - ${invoices.advance}`).mapWith(Number) }).from(invoices).where(eq(invoices.status, "issued")),
    db.select({ n: count() }).from(challans).where(eq(challans.status, "issued")),
    db.query.enquiries.findMany({ orderBy: desc(enquiries.id), limit: 5 }),
    db.query.orders.findMany({ orderBy: desc(orders.no), limit: 5, with: { customer: { columns: { name: true } }, items: { columns: { service: true, specs: true }, orderBy: (t, { asc }) => [asc(t.sort)], limit: 1 } } }),
    getStore(db),
    getSeller(db),
  ]);
  const setup = [
    { done: store.whatsapp !== PLACEHOLDER_WA, label: "Set your real WhatsApp number", href: "/admin/settings#contact" },
    { done: !store.phone.includes("XXX") && !!store.phone, label: "Add the shop phone and address", href: "/admin/settings#contact" },
    { done: GSTIN_RE.test(seller.gstin), label: "Add GSTIN to issue tax invoices", href: "/admin/settings#billing" },
    { done: opts.turnstile, label: "Turn on spam protection (Turnstile keys) so site forms work", href: "" },
  ];
  return { stats, newEnquiries: enq.fresh, unpaidInvoices: { n: inv.n, due: inv.due ?? 0 }, undelivered: dc.n, recentEnquiries, recentOrders, setup };
}
