import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { connect, type Db } from "@/db";
import { counters, invoiceItems, invoices } from "@/db/schema";
import { AdminError } from "@/lib/admin-categories";
import { createInvoiceFromOrder, deleteDraft, getInvoice, issueInvoice, listInvoices, setInvoicePaid, updateDraft, type DraftInput } from "@/lib/admin-invoices";
import { createOrder, type OrderInput } from "@/lib/admin-orders";
import { financialYear, invoiceNo, invoiceTotals, rupeesInWords } from "@/lib/gst";
import { DEFAULT_SELLER, getSeller, saveSeller } from "@/lib/settings";

let mf: Miniflare;
let db: Db;

const order = (over: Partial<OrderInput> = {}): OrderInput => ({
  customer: { phone: "9825012345", name: "Mehta", business: "Mehta Traders", gstin: "", city: "Surat", address: "Ring Road" },
  items: [{ service: "vc", specs: { paper: "350 GSM art card", finish: "Matt lamination" }, qty: "1000", unit: "pcs", rate: "0.65", hsn: "4911" }],
  dueOn: "", deliveryMode: "pickup", designBy: "we", proofBy: "whatsapp", notes: "", gstRate: 18, advance: "300", payMode: "upi",
  ...over,
});

const draft = (over: Partial<DraftInput> = {}): DraftInput => ({
  billName: "Mehta Traders", billGstin: "", billAddress: "Surat", placeOfSupply: "24", gstRate: 18, advance: "0", note: "",
  items: [{ description: "Visiting cards", hsn: "4911", qty: "1000", unit: "pcs", rate: "0.65" }, { description: "Design", hsn: "998391", qty: "1", unit: "pcs", rate: "150" }],
  ...over,
});

const seller = { ...DEFAULT_SELLER, gstin: "24ABCDE1234F1Z5" };

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: "export default {}", d1Databases: ["DB"] });
  db = connect(await mf.getD1Database("DB"));
  await migrate(db, { migrationsFolder: "drizzle" });
});

afterAll(() => mf.dispose());

describe("gst helpers", () => {
  it("splits intra-state tax and rounds to the rupee", () => {
    expect(invoiceTotals([{ qty: 1000, rate: 65 }, { qty: 1, rate: 15000 }], 18, true)).toEqual({ taxable: 80000, cgst: 7200, sgst: 7200, igst: 0, roundOff: 0, total: 94400 });
    expect(invoiceTotals([{ qty: 3, rate: 333 }], 18, false)).toEqual({ taxable: 999, cgst: 0, sgst: 0, igst: 180, roundOff: 21, total: 1200 });
    expect(invoiceTotals([{ qty: 1, rate: 1049 }], 0, true).roundOff).toBe(-49);
  });

  it("uses the April–March financial year", () => {
    expect(financialYear("2026-03-31")).toBe("25-26");
    expect(financialYear("2026-04-01")).toBe("26-27");
    expect(financialYear("2099-12-01")).toBe("99-00");
    expect(invoiceNo("26-27", 89)).toBe("INV/26-27/0089");
  });

  it("writes amounts in Indian words", () => {
    expect(rupeesInWords(94400)).toBe("Rupees Nine Hundred Forty Four Only");
    expect(rupeesInWords(1234567800)).toBe("Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only");
    expect(rupeesInWords(10000000005)).toBe("Rupees Ten Crore and Five Paise Only");
    expect(rupeesInWords(0)).toBe("Rupees Zero Only");
  });
});

describe("settings", () => {
  it("returns defaults, validates and saves billing details", async () => {
    expect((await getSeller(db)).stateCode).toBe("24");
    await expect(saveSeller(db, { ...seller, gstin: "nope" })).rejects.toBeInstanceOf(ZodError);
    await expect(saveSeller(db, { ...seller, ifsc: "123" })).rejects.toBeInstanceOf(ZodError);
    await saveSeller(db, { ...seller, gstin: "24abcde1234f1z5" });
    expect((await getSeller(db)).gstin).toBe("24ABCDE1234F1Z5");
  });
});

describe("invoice lifecycle", () => {
  it("creates one draft per order from its items and customer", async () => {
    const o = await createOrder(db, order({ customer: { ...order().customer, gstin: "27ABCDE1234F1Z5" } }));
    const id = await createInvoiceFromOrder(db, o.id);
    expect(await createInvoiceFromOrder(db, o.id)).toBe(id);
    const inv = (await getInvoice(db, id))!;
    expect(inv).toMatchObject({ status: "draft", seq: null, billName: "Mehta Traders", placeOfSupply: "27", taxable: 65000, cgst: 0, igst: 11700, total: 76700, advance: 30000 });
    expect(inv.items[0].description).toBe("Visiting card – 350 GSM art card · Matt lamination");
    await expect(createInvoiceFromOrder(db, 999999)).rejects.toBeInstanceOf(AdminError);
  });

  it("edits a draft, issues gap-free numbers per FY, then locks it", async () => {
    const a = await createInvoiceFromOrder(db, (await createOrder(db, order())).id);
    const b = await createInvoiceFromOrder(db, (await createOrder(db, order())).id);
    await updateDraft(db, a, draft({ advance: "100" }));
    expect(await getInvoice(db, a)).toMatchObject({ taxable: 80000, cgst: 7200, sgst: 7200, total: 94400, advance: 10000 });
    expect((await getInvoice(db, a))!.items).toHaveLength(2);

    expect(await issueInvoice(db, a, "2027-03-31")).toEqual({ fy: "26-27", seq: 1 });
    await expect(issueInvoice(db, a, "2027-03-31")).rejects.toBeInstanceOf(AdminError);
    expect(await issueInvoice(db, b, "2027-04-01")).toEqual({ fy: "27-28", seq: 1 });
    expect((await getInvoice(db, a))!.seller?.gstin).toBe("24ABCDE1234F1Z5");

    await expect(updateDraft(db, a, draft())).rejects.toBeInstanceOf(AdminError);
    await expect(deleteDraft(db, a)).rejects.toBeInstanceOf(AdminError);
    expect(await db.$count(invoiceItems, eq(invoiceItems.invoiceId, a))).toBe(2);
    expect(await db.select().from(counters).where(eq(counters.series, "INV/26-27"))).toEqual([{ series: "INV/26-27", next: 2 }]);
  });

  it("gives concurrent issues distinct consecutive numbers", async () => {
    const ids = await Promise.all([1, 2, 3, 4, 5].map(async () => createInvoiceFromOrder(db, (await createOrder(db, order())).id)));
    const issued = await Promise.all(ids.map((id) => issueInvoice(db, id, "2028-05-01")));
    expect(issued.map((r) => r.seq).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(issued.map((r) => r.fy))).toEqual(new Set(["28-29"]));
  });

  it("refuses to issue without a seller GSTIN and validates drafts", async () => {
    const id = await createInvoiceFromOrder(db, (await createOrder(db, order())).id);
    await saveSeller(db, { ...seller, gstin: "" });
    await expect(issueInvoice(db, id, "2026-10-24")).rejects.toThrow("GSTIN");
    await saveSeller(db, seller);
    await expect(updateDraft(db, id, draft({ advance: "999999" }))).rejects.toBeInstanceOf(AdminError);
    await expect(updateDraft(db, id, draft({ items: [] }))).rejects.toBeInstanceOf(ZodError);
    await expect(updateDraft(db, id, draft({ placeOfSupply: "99" }))).rejects.toBeInstanceOf(ZodError);
    expect((await getInvoice(db, id))!.status).toBe("draft");
  });

  it("marks paid and back, deletes drafts only", async () => {
    const issued = (await listInvoices(db, "issued"))[0];
    await setInvoicePaid(db, issued.id, true);
    await expect(setInvoicePaid(db, issued.id, true)).rejects.toBeInstanceOf(AdminError);
    expect((await listInvoices(db, "paid")).map((i) => i.id)).toEqual([issued.id]);
    await setInvoicePaid(db, issued.id, false);

    const [d] = await listInvoices(db, "draft");
    await expect(setInvoicePaid(db, d.id, true)).rejects.toBeInstanceOf(AdminError);
    await deleteDraft(db, d.id);
    expect(await db.$count(invoices, eq(invoices.id, d.id))).toBe(0);
    expect(await db.$count(invoiceItems, eq(invoiceItems.invoiceId, d.id))).toBe(0);
  });
});
