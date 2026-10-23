import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { connect, type Db } from "@/db";
import { challanItems, challans } from "@/db/schema";
import { AdminError } from "@/lib/admin-categories";
import { challanNo, createChallanFromOrder, deleteChallanDraft, getChallan, issueChallan, listChallans, setChallanDelivered, updateChallanDraft, type ChallanInput } from "@/lib/admin-challans";
import { createInvoiceFromOrder, issueInvoice } from "@/lib/admin-invoices";
import { createOrder, type OrderInput } from "@/lib/admin-orders";
import { DEFAULT_SELLER, saveSeller } from "@/lib/settings";

let mf: Miniflare;
let db: Db;

const order: OrderInput = {
  customer: { phone: "9825012345", name: "Mehta", business: "", gstin: "", city: "Surat", address: "Ring Road" },
  items: [
    { service: "vc", specs: { paper: "350 GSM art card" }, qty: "1000", unit: "pcs", rate: "0.65", hsn: "4911" },
    { service: "pam", specs: { size: "A4" }, qty: "5000", unit: "pcs", rate: "1.25", hsn: "4911" },
  ],
  dueOn: "", deliveryMode: "delivery", designBy: "we", proofBy: "whatsapp", notes: "", gstRate: 18, advance: "", payMode: "",
};

const input = (over: Partial<ChallanInput> = {}): ChallanInput => ({
  deliverTo: "Mehta", phone: "+91 98250 12345", address: "Ring Road, Surat", mode: "delivery", vehicle: "GJ-05-AB-1234", purpose: "part", returnable: false,
  items: [{ description: "Pamphlets A4 (part 1 of 2)", qty: "2500", unit: "pcs", packing: "5 bundles" }],
  ...over,
});

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: "export default {}", d1Databases: ["DB"] });
  db = connect(await mf.getD1Database("DB"));
  await migrate(db, { migrationsFolder: "drizzle" });
  await saveSeller(db, { ...DEFAULT_SELLER, gstin: "24ABCDE1234F1Z5" });
});

afterAll(() => mf.dispose());

describe("challans", () => {
  it("creates drafts from an order with each item attached to its own challan", async () => {
    const o = await createOrder(db, order);
    const a = await createChallanFromOrder(db, o.id);
    const b = await createChallanFromOrder(db, o.id);
    expect(a).not.toBe(b);
    const c = (await getChallan(db, a))!;
    expect(c).toMatchObject({ status: "draft", seq: null, deliverTo: "Mehta", phone: "+91 98250 12345", address: "Ring Road, Surat", mode: "delivery" });
    expect(c.items.map((i) => [i.description, i.qty])).toEqual([["Visiting card – 350 GSM art card", 1000], ["Pamphlet / poster – A4", 5000]]);
    expect(await db.$count(challanItems, eq(challanItems.challanId, b))).toBe(2);
    await expect(createChallanFromOrder(db, 999999)).rejects.toBeInstanceOf(AdminError);
  });

  it("edits drafts, issues DC numbers per FY independent of invoices, then locks", async () => {
    const o = await createOrder(db, order);
    const id = await createChallanFromOrder(db, o.id);
    await updateChallanDraft(db, id, input({ returnable: true }));
    expect(await getChallan(db, id)).toMatchObject({ purpose: "part", returnable: true, vehicle: "GJ-05-AB-1234" });
    expect((await getChallan(db, id))!.items).toHaveLength(1);

    await issueInvoice(db, await createInvoiceFromOrder(db, o.id), "2026-10-24");
    const r = await issueChallan(db, id, "2026-10-24");
    expect(r).toEqual({ fy: "26-27", seq: 1 });
    expect(challanNo(r.fy, r.seq)).toBe("DC/26-27/0001");
    expect((await getChallan(db, id))!.seller?.gstin).toBe("24ABCDE1234F1Z5");

    await expect(issueChallan(db, id, "2026-10-24")).rejects.toBeInstanceOf(AdminError);
    await expect(updateChallanDraft(db, id, input())).rejects.toBeInstanceOf(AdminError);
    await expect(deleteChallanDraft(db, id)).rejects.toBeInstanceOf(AdminError);
    expect(await db.$count(challanItems, eq(challanItems.challanId, id))).toBe(1);
  });

  it("validates input", async () => {
    const id = (await listChallans(db, "draft"))[0].id;
    await expect(updateChallanDraft(db, id, input({ items: [] }))).rejects.toBeInstanceOf(ZodError);
    await expect(updateChallanDraft(db, id, input({ purpose: "gift" as "part" }))).rejects.toBeInstanceOf(ZodError);
    await expect(updateChallanDraft(db, id, input({ items: [{ description: "x", qty: "0", unit: "pcs", packing: "" }] }))).rejects.toBeInstanceOf(ZodError);
    await expect(updateChallanDraft(db, 999999, input())).rejects.toBeInstanceOf(AdminError);
  });

  it("gives concurrent issues distinct consecutive numbers", async () => {
    const drafts = (await listChallans(db, "draft")).map((c) => c.id);
    const issued = await Promise.all(drafts.map((id) => issueChallan(db, id, "2026-11-01")));
    expect(issued.map((r) => r.seq).sort()).toEqual(drafts.map((_, i) => i + 2));
  });

  it("marks delivered and back, deletes drafts only", async () => {
    const [c] = await listChallans(db, "issued");
    await setChallanDelivered(db, c.id, true);
    expect((await getChallan(db, c.id))!.deliveredAt).toBeInstanceOf(Date);
    await expect(setChallanDelivered(db, c.id, true)).rejects.toBeInstanceOf(AdminError);
    await setChallanDelivered(db, c.id, false);

    const d = await createChallanFromOrder(db, (await createOrder(db, order)).id);
    await expect(setChallanDelivered(db, d, true)).rejects.toBeInstanceOf(AdminError);
    await deleteChallanDraft(db, d);
    expect(await db.$count(challans, eq(challans.id, d))).toBe(0);
    expect(await db.$count(challanItems, eq(challanItems.challanId, d))).toBe(0);
  });
});
