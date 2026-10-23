import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { connect, type Db } from "@/db";
import { createChallanFromOrder, issueChallan } from "@/lib/admin-challans";
import { createInvoiceFromOrder, issueInvoice } from "@/lib/admin-invoices";
import { createOrder, istToday, type OrderInput } from "@/lib/admin-orders";
import { dashboard } from "@/lib/dashboard";
import { createEnquiry, setEnquiryStatus } from "@/lib/enquiries";
import { DEFAULT_SELLER, DEFAULT_STORE, PLACEHOLDER_WA, getStore, saveSeller, saveStore } from "@/lib/settings";
import { waLink } from "@/lib/site";

let mf: Miniflare;
let db: Db;

const order = (over: Partial<OrderInput> = {}): OrderInput => ({
  customer: { phone: "9825012345", name: "Mehta", business: "", gstin: "", city: "Surat", address: "" },
  items: [{ service: "vc", specs: {}, qty: "1000", unit: "pcs", rate: "1", hsn: "4911" }],
  dueOn: "", deliveryMode: "pickup", designBy: "we", proofBy: "whatsapp", notes: "", gstRate: 0, advance: "", payMode: "",
  ...over,
});

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: "export default {}", d1Databases: ["DB"] });
  db = connect(await mf.getD1Database("DB"));
  await migrate(db, { migrationsFolder: "drizzle" });
});

afterAll(() => mf.dispose());

describe("store settings", () => {
  it("defaults to the current site copy and saves validated values", async () => {
    expect(await getStore(db)).toEqual(DEFAULT_STORE);
    await expect(saveStore(db, { ...DEFAULT_STORE, whatsapp: "12" })).rejects.toBeInstanceOf(ZodError);
    await expect(saveStore(db, { ...DEFAULT_STORE, facebook: "javascript:alert(1)" })).rejects.toBeInstanceOf(ZodError);
    await expect(saveStore(db, { ...DEFAULT_STORE, instagram: "http://insecure.example" })).rejects.toBeInstanceOf(ZodError);
    await expect(saveStore(db, { ...DEFAULT_STORE, name: " " })).rejects.toBeInstanceOf(ZodError);
    await saveStore(db, { ...DEFAULT_STORE, whatsapp: "+91 98250 99999", instagram: "https://instagram.com/rajgraphics", name: " Raj Graphics Surat " });
    expect(await getStore(db)).toMatchObject({ whatsapp: "919825099999", instagram: "https://instagram.com/rajgraphics", name: "Raj Graphics Surat" });
    expect(waLink("919825099999", "Hi & bye")).toBe("https://wa.me/919825099999?text=Hi%20%26%20bye");
  });
});

describe("dashboard", () => {
  it("counts what needs attention and lists recent activity", async () => {
    await saveStore(db, { ...DEFAULT_STORE, whatsapp: PLACEHOLDER_WA });
    await saveSeller(db, { ...DEFAULT_SELLER, gstin: "24ABCDE1234F1Z5" });
    const today = istToday();
    const a = await createOrder(db, order({ dueOn: today, advance: "200", payMode: "cash" }));
    await createOrder(db, order({ customer: { ...order().customer, phone: "9825054321", name: "Shah" } }));
    await issueInvoice(db, await createInvoiceFromOrder(db, a.id), today);
    await issueChallan(db, await createChallanFromOrder(db, a.id), today);
    await createEnquiry(db, { source: "quote", name: "Asha", phone: "9000000001", product: "", qty: "", city: "", message: "" });
    const won = await createEnquiry(db, { source: "contact", name: "Ravi", phone: "9000000002", product: "Stickers", qty: "", city: "", message: "" });
    await setEnquiryStatus(db, won, "won");

    const d = await dashboard(db, { turnstile: false });
    expect(d).toMatchObject({ newEnquiries: 1, undelivered: 1, unpaidInvoices: { n: 1, due: 80000 } });
    expect(d.stats).toMatchObject({ pending: 2, dueToday: 1, balance: 180000 });
    expect(d.recentOrders.map((o) => o.customer.name)).toEqual(["Shah", "Mehta"]);
    expect(d.recentEnquiries.map((e) => e.name)).toEqual(["Ravi", "Asha"]);
    expect(d.setup.filter((s) => !s.done).map((s) => s.label)).toEqual(["Set your real WhatsApp number", "Add the shop phone and address", "Add real customer reviews for the home page", "Turn on spam protection (Turnstile keys) so site forms work"]);
  });
});
