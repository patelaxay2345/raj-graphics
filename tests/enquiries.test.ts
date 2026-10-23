import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { connect, type Db } from "@/db";
import { AdminError } from "@/lib/admin-categories";
import { RATE_LIMIT, RateLimitedError, createEnquiry, getEnquiry, listEnquiries, orderPrefill, saveEnquiryNotes, setEnquiryStatus, type EnquiryInput } from "@/lib/enquiries";
import { turnstileKeys, verifyTurnstile } from "@/lib/turnstile";

let mf: Miniflare;
let db: Db;
const base: EnquiryInput = { source: "quote", name: "Asha", phone: "98250 11111", product: "Visiting Cards", qty: "1,000 pcs", city: "Surat", message: "Matt lamination" };

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: "export default {}", d1Databases: ["DB"] });
  db = connect(await mf.getD1Database("DB"));
  await migrate(db, { migrationsFolder: "drizzle" });
});

afterAll(() => mf.dispose());

describe("turnstile", () => {
  it("uses configured keys, test keys only in development, otherwise fails closed", () => {
    expect(turnstileKeys({ TURNSTILE_SITE_KEY: "s", TURNSTILE_SECRET_KEY: "k" }, false)).toEqual({ site: "s", secret: "k" });
    expect(turnstileKeys({}, true)?.site).toMatch(/^1x0+AA$/);
    expect(turnstileKeys({}, false)).toBeNull();
    expect(turnstileKeys({ TURNSTILE_SITE_KEY: "s" }, false)).toBeNull();
  });

  it("verifies tokens with siteverify and treats every failure as rejection", async () => {
    const ok = vi.fn(async () => Response.json({ success: true }));
    expect(await verifyTurnstile("tok", "sec", "1.2.3.4", ok)).toBe(true);
    const body = (ok.mock.calls[0] as unknown as [string, RequestInit])[1].body as URLSearchParams;
    expect(Object.fromEntries(body)).toEqual({ secret: "sec", response: "tok", remoteip: "1.2.3.4" });

    expect(await verifyTurnstile("tok", "sec", null, async () => Response.json({ success: false }))).toBe(false);
    expect(await verifyTurnstile("tok", "sec", null, async () => new Response("<html>", { status: 502 }))).toBe(false);
    expect(await verifyTurnstile("tok", "sec", null, async () => { throw new Error("down"); })).toBe(false);
    const never = vi.fn();
    expect(await verifyTurnstile("", "sec", null, never)).toBe(false);
    expect(await verifyTurnstile("x".repeat(2049), "sec", null, never)).toBe(false);
    expect(never).not.toHaveBeenCalled();
  });
});

describe("enquiries", () => {
  it("stores a normalised enquiry and validates input", async () => {
    const id = await createEnquiry(db, base);
    expect(await getEnquiry(db, id)).toMatchObject({ phone: "919825011111", status: "new", source: "quote", qty: "1,000 pcs" });
    await expect(createEnquiry(db, { ...base, phone: "123" })).rejects.toBeInstanceOf(ZodError);
    await expect(createEnquiry(db, { ...base, name: " " })).rejects.toBeInstanceOf(ZodError);
    await expect(createEnquiry(db, { ...base, message: "x".repeat(2001) })).rejects.toBeInstanceOf(ZodError);
    await expect(createEnquiry(db, { ...base, source: "spam" as "quote" })).rejects.toBeInstanceOf(ZodError);
  });

  it("rate limits per phone within the window", async () => {
    const t = Date.now();
    const p = { ...base, phone: "9000000002" };
    for (let i = 0; i < RATE_LIMIT.max; i++) await createEnquiry(db, p, t + i);
    await expect(createEnquiry(db, p, t + 10)).rejects.toBeInstanceOf(RateLimitedError);
    await expect(createEnquiry(db, { ...p, phone: "+91 90000 00002" }, t + 10)).rejects.toBeInstanceOf(RateLimitedError);
    await createEnquiry(db, { ...base, phone: "9000000003" }, t + 10);
    await createEnquiry(db, p, t + RATE_LIMIT.windowMs + 5000);
  });

  it("lists by status with counts and searches", async () => {
    const id = await createEnquiry(db, { ...base, phone: "9000000009", name: "Shah_100%", product: "Pamphlet / Posters", city: "Rajkot" });
    await setEnquiryStatus(db, id, "quoted");
    await saveEnquiryNotes(db, id, "  Quoted ₹1,300  ");
    expect(await getEnquiry(db, id)).toMatchObject({ status: "quoted", notes: "Quoted ₹1,300" });
    await expect(setEnquiryStatus(db, id, "deleted")).rejects.toBeInstanceOf(ZodError);
    await expect(setEnquiryStatus(db, 999999, "won")).rejects.toBeInstanceOf(AdminError);

    const quoted = await listEnquiries(db, "quoted", "");
    expect(quoted.rows.map((r) => r.id)).toEqual([id]);
    expect(quoted.counts.quoted).toBe(1);
    expect(quoted.counts.all).toBe(quoted.counts.new! + 1);
    for (const q of ["rajkot", "_100%", "90000 00009", "pamphlet"]) expect((await listEnquiries(db, "all", q)).rows.map((r) => r.id)).toContain(id);
    expect((await listEnquiries(db, "all", "%")).rows.map((r) => r.id)).toEqual([id]);
    expect((await listEnquiries(db, "all", "rajkot")).counts).toEqual({ quoted: 1, all: 1 });
  });

  it("prefills a job card from an enquiry", () => {
    expect(orderPrefill({ ...base, phone: "919825011111" })).toEqual({
      customer: { phone: "919825011111", name: "Asha", city: "Surat" },
      item: { service: "vc", specs: {}, qty: "1000", unit: "pcs", hsn: "4911" },
      notes: "Enquiry: Visiting Cards × 1,000 pcs\nMatt lamination",
    });
    expect(orderPrefill({ ...base, product: "Wedding Invitation Cards", qty: "" }).item).toMatchObject({ service: "inv", qty: "" });
    expect(orderPrefill({ ...base, product: "Bill Books", qty: "about 30" }).item).toMatchObject({ service: "oth", specs: { product: "Bill Books" }, qty: "30" });
    expect(orderPrefill({ ...base, product: "Branded Pens" }).item).toMatchObject({ service: "oth", specs: {} });
  });
});
