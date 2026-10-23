import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { settings, type Seller } from "@/db/schema";
import { gstinSchema } from "@/lib/admin-orders";
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
