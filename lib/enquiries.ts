import { and, count, desc, eq, gte, or, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import type { Db } from "@/db";
import { enquiries } from "@/db/schema";
import { AdminError } from "@/lib/admin-categories";
import { normalizePhone, SERVICES, type ServiceId } from "@/lib/order-format";

const text = (maxLen: number) => z.string().trim().max(maxLen);

export const enquirySchema = z.object({
  source: z.enum(["quote", "contact"]),
  name: text(80).min(1, "Please enter your name"),
  phone: z.string().transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) ctx.addIssue({ code: "custom", message: "Please enter a valid mobile number" });
    return p ?? "";
  }),
  product: text(120),
  qty: text(40),
  city: text(60),
  message: text(2000),
});

export type EnquiryInput = z.input<typeof enquirySchema>;

export const RATE_LIMIT = { max: 3, windowMs: 10 * 60_000 };

export class RateLimitedError extends Error {}

export async function createEnquiry(db: Db, input: EnquiryInput, now = Date.now()) {
  const e = enquirySchema.parse(input);
  const [{ n }] = await db
    .select({ n: count() })
    .from(enquiries)
    .where(and(eq(enquiries.phone, e.phone), gte(enquiries.createdAt, new Date(now - RATE_LIMIT.windowMs))));
  if (n >= RATE_LIMIT.max) throw new RateLimitedError();
  const [row] = await db.insert(enquiries).values({ ...e, createdAt: new Date(now) }).returning({ id: enquiries.id });
  return row.id;
}

export type EnquiryStatus = (typeof enquiries.status.enumValues)[number];
export const STATUSES: [EnquiryStatus, string][] = [["new", "New"], ["quoted", "Quoted"], ["won", "Won"], ["lost", "Lost"]];

export async function setEnquiryStatus(db: Db, id: number, status: string) {
  const s = z.enum(["new", "quoted", "won", "lost"]).parse(status);
  const [row] = await db.update(enquiries).set({ status: s, updatedAt: new Date() }).where(eq(enquiries.id, id)).returning({ id: enquiries.id });
  if (!row) throw new AdminError("Enquiry not found");
}

export async function saveEnquiryNotes(db: Db, id: number, notes: string) {
  const [row] = await db.update(enquiries).set({ notes: text(2000).parse(notes), updatedAt: new Date() }).where(eq(enquiries.id, id)).returning({ id: enquiries.id });
  if (!row) throw new AdminError("Enquiry not found");
}

export const getEnquiry = (db: Db, id: number) => db.query.enquiries.findFirst({ where: eq(enquiries.id, id) });

export async function listEnquiries(db: Db, tab: EnquiryStatus | "all", q: string) {
  const needle = q.trim();
  const pattern = `%${needle.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const like = (col: AnySQLiteColumn) => sql`${col} like ${pattern} escape '\\'`;
  const digits = needle.replace(/\D/g, "");
  const search = needle ? or(like(enquiries.name), like(enquiries.product), like(enquiries.city), digits.length >= 3 ? sql`${enquiries.phone} like ${`%${digits}%`}` : undefined) : undefined;
  const [rows, counts] = await Promise.all([
    db.query.enquiries.findMany({ where: and(tab === "all" ? undefined : eq(enquiries.status, tab), search), orderBy: desc(enquiries.id), limit: 200 }),
    db.select({ status: enquiries.status, n: count() }).from(enquiries).where(search).groupBy(enquiries.status),
  ]);
  const by = Object.fromEntries(counts.map((c) => [c.status, c.n])) as Partial<Record<EnquiryStatus, number>>;
  return { rows, counts: { ...by, all: counts.reduce((a, c) => a + c.n, 0) } };
}

const GUESS: [RegExp, ServiceId][] = [[/visiting|business card/i, "vc"], [/invit|wedding|kankotri/i, "inv"], [/newspaper|advert/i, "ad"], [/pamphlet|poster|flyer|leaflet/i, "pam"]];

export function orderPrefill(e: { name: string; phone: string; city: string; product: string; qty: string; message: string }) {
  const service = GUESS.find(([re]) => re.test(e.product))?.[1] ?? "oth";
  const s = SERVICES.find((x) => x.id === service)!;
  const productOption = service === "oth" ? s.fields[0].options!.find((o) => e.product.toLowerCase().startsWith(o.toLowerCase().replace(/s$/, ""))) : undefined;
  const specs: Record<string, string> = productOption ? { product: productOption } : {};
  const qty = e.qty.replace(/,/g, "").match(/\d{1,7}/)?.[0] ?? "";
  return {
    customer: { phone: e.phone, name: e.name, city: e.city },
    item: { service, specs, qty, unit: s.unit, hsn: s.hsn },
    notes: [e.product && `Enquiry: ${e.product}${e.qty ? ` × ${e.qty}` : ""}`, e.message].filter(Boolean).join("\n").slice(0, 2000),
  };
}
