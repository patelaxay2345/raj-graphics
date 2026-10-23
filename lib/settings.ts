import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { settings, type Seller } from "@/db/schema";
import { gstinSchema } from "@/lib/admin-orders";
import { normalizePhone } from "@/lib/order-format";
import { STATES } from "@/lib/gst";

const text = (maxLen: number) => z.string().trim().max(maxLen);

export const sellerSchema = z.object({
  legalName: text(120).min(1, "Legal name is required"),
  gstin: gstinSchema,
  pan: text(10).toUpperCase().regex(/^$|^[A-Z]{5}\d{4}[A-Z]$/, "PAN should look like ABCDE1234F"),
  stateCode: z.string().refine((c) => STATES.some(([s]) => s === c), "Pick a state"),
  address: text(400),
  phone: text(40),
  email: z.union([z.literal(""), z.email("Enter a valid email")]),
  bankName: text(80),
  account: text(20).regex(/^\d*$/, "Account number is digits only"),
  ifsc: text(11).toUpperCase().regex(/^$|^[A-Z]{4}0[A-Z\d]{6}$/, "IFSC should look like SBIN0001234"),
  upi: text(60).regex(/^$|^[\w.-]+@[\w.-]+$/, "UPI ID should look like name@bank"),
  terms: text(1500),
});

export const DEFAULT_SELLER: Seller = {
  legalName: "Raj Graphics", gstin: "", pan: "", stateCode: "24", address: "", phone: "", email: "",
  bankName: "", account: "", ifsc: "", upi: "",
  terms: "1. Printed goods are made to order and cannot be returned.\n2. Please check the proof carefully; errors approved in the proof are not reprinted free.\n3. Subject to local jurisdiction.",
};

export async function getSeller(db: Db): Promise<Seller> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, "billing") });
  return { ...DEFAULT_SELLER, ...(row?.value as Partial<Seller> | undefined) };
}

export async function saveSeller(db: Db, input: z.input<typeof sellerSchema>) {
  const value = sellerSchema.parse(input);
  await db.insert(settings).values({ key: "billing", value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

const url = z.union([z.literal(""), z.string().trim().max(200).regex(/^https:\/\/[^\s]+$/, "Links must start with https://")]);

export const storeSchema = z.object({
  name: text(60).min(1, "Business name is required"),
  tagline: text(60),
  about: text(300),
  phone: text(40),
  whatsapp: z.string().transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) ctx.addIssue({ code: "custom", message: "Enter the WhatsApp number with country code, e.g. 91 98250 12345" });
    return p ?? "";
  }),
  email: z.union([z.literal(""), z.email("Enter a valid email")]),
  address: text(200),
  hours: text(80),
  facebook: url,
  instagram: url,
  youtube: url,
  linkedin: url,
  seoTitle: text(70).min(1, "Page title is required"),
  seoDescription: text(160),
});

export type Store = z.output<typeof storeSchema>;

export const PLACEHOLDER_WA = "919800000000";

export const DEFAULT_STORE: Store = {
  name: "Raj Graphics",
  tagline: "THE PERFECTION OF PRINTING",
  about: "Your trusted printing partner for high-quality printing solutions at the best prices. Serving businesses across India.",
  phone: "+91 98XXX XXXXX",
  whatsapp: PLACEHOLDER_WA,
  email: "hello@rajgraphics.in",
  address: "City, State, India",
  hours: "Mon – Sat: 10:00 AM – 8:00 PM",
  facebook: "",
  instagram: "",
  youtube: "",
  linkedin: "",
  seoTitle: "Raj Graphics — The Perfection of Printing",
  seoDescription: "Visiting cards, wedding invitations, newspaper ads, pamphlets and all printing at the best prices. Quick quote on WhatsApp.",
};

export async function getStore(db: Db): Promise<Store> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, "store") });
  return { ...DEFAULT_STORE, ...(row?.value as Partial<Store> | undefined) };
}

export async function saveStore(db: Db, input: z.input<typeof storeSchema>) {
  const value = storeSchema.parse(input);
  await db.insert(settings).values({ key: "store", value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}
