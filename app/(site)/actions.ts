"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { RateLimitedError, createEnquiry, enquirySchema } from "@/lib/enquiries";
import { turnstileKeys, verifyTurnstile } from "@/lib/turnstile";

export type EnquiryState = { ok?: boolean; error?: string; n?: number };

const UNAVAILABLE = "Our form is unavailable right now. Please message us on WhatsApp.";

export async function submitEnquiry(prev: EnquiryState, fd: FormData): Promise<EnquiryState> {
  const n = (prev.n ?? 0) + 1;
  if (String(fd.get("website") ?? "")) return { ok: true, n };

  const field = (k: string) => String(fd.get(k) ?? "");
  const input = { source: field("source") === "contact" ? "contact" : "quote", name: field("name"), phone: field("phone"), product: field("product"), qty: field("qty"), city: field("city"), message: field("msg") } as const;
  const parsed = enquirySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, n };

  const { env } = getCloudflareContext();
  const keys = turnstileKeys(env, process.env.NODE_ENV === "development");
  if (!keys) return { error: UNAVAILABLE, n };
  const ip = (await headers()).get("cf-connecting-ip");
  if (!(await verifyTurnstile(field("cf-turnstile-response"), keys.secret, ip))) return { error: "We couldn’t verify you’re not a bot. Please try again, or message us on WhatsApp.", n };

  try {
    await createEnquiry(getDb(), input);
  } catch (e) {
    if (e instanceof RateLimitedError) return { error: "We already have your recent enquiries and will call you soon. For anything urgent, message us on WhatsApp.", n };
    throw e;
  }
  return { ok: true, n };
}
