import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { connect, type Db } from "@/db";
import { counters, customers, orderItems } from "@/db/schema";
import { AdminError } from "@/lib/admin-categories";
import { createOrder, findCustomer, getOrder, istMonthStart, istToday, listOrders, orderStats, setOrderStatus, updateOrder, type OrderInput } from "@/lib/admin-orders";
import { inr, jobSummary, normalizePhone, orderNo, toPaise, totals } from "@/lib/order-format";

let mf: Miniflare;
let db: Db;

const base = (over: Partial<OrderInput> = {}): OrderInput => ({
  customer: { phone: "98250 12345", name: "Mehta Traders", business: "", gstin: "", city: "Surat", address: "" },
  items: [{ service: "vc", specs: { paper: "350 GSM art card", finish: "Matt lamination", design: " VC-14 ", names: "" }, qty: "1000", unit: "pcs", rate: "0.65", hsn: "4911" }],
  dueOn: "2026-10-28",
  deliveryMode: "pickup",
  designBy: "we",
  proofBy: "whatsapp",
  notes: "",
  gstRate: 18,
  advance: "300",
  payMode: "upi",
  ...over,
});

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: "export default {}", d1Databases: ["DB"] });
  db = connect(await mf.getD1Database("DB"));
  await migrate(db, { migrationsFolder: "drizzle" });
});

afterAll(() => mf.dispose());

describe("order-format", () => {
  it("parses rupees to paise without float error", () => {
    expect(toPaise("0.65")).toBe(65);
    expect(toPaise("1,250.5")).toBe(125050);
    expect(toPaise("19.99")).toBe(1999);
    expect(toPaise("1.005")).toBeNull();
    expect(toPaise("-5")).toBeNull();
    expect(toPaise("abc")).toBeNull();
  });

  it("computes GST, totals and balance in paise", () => {
    expect(totals([{ qty: 1000, rate: 65 }, { qty: 3, rate: 333 }], 18, 30000)).toEqual({ subtotal: 65999, tax: 11880, total: 77879, balance: 47879 });
    expect(inr(77879)).toBe("₹778.79");
  });

  it("normalises Indian phone numbers", () => {
    expect(normalizePhone("98250 12345")).toBe("919825012345");
    expect(normalizePhone("+91-98250-12345")).toBe("919825012345");
    expect(normalizePhone("098250 12345")).toBe("919825012345");
    expect(normalizePhone("12345")).toBeNull();
  });

  it("summarises a job", () => {
    expect(jobSummary({ service: "oth", specs: { product: "Bill Books", size: "A5", description: "long text" } })).toEqual({ title: "Bill Books", spec: "A5" });
    expect(orderNo(7)).toBe("ORD-0007");
  });
});

describe("createOrder", () => {
  it("numbers orders, upserts the customer and stores computed money", async () => {
    const a = await createOrder(db, base());
    const b = await createOrder(db, base({ customer: { ...base().customer, phone: "+91 98250 12345", name: "Mehta Traders Pvt" } }));
    expect([a.no, b.no]).toEqual([1, 2]);
    expect(await db.$count(customers)).toBe(1);
    expect((await findCustomer(db, "9825012345"))?.name).toBe("Mehta Traders Pvt");

    const o = (await getOrder(db, a.id))!;
    expect(o).toMatchObject({ subtotal: 65000, tax: 11700, total: 76700, advance: 30000, status: "pending", payMode: "upi", dueOn: "2026-10-28" });
    expect(o.items[0]).toMatchObject({ qty: 1000, rate: 65, specs: { paper: "350 GSM art card", finish: "Matt lamination", design: "VC-14" } });
  });

  it("rejects bad input without consuming a number", async () => {
    const reject = (o: OrderInput) => expect(createOrder(db, o)).rejects.toBeInstanceOf(ZodError);
    await reject(base({ items: [] }));
    await reject(base({ customer: { ...base().customer, phone: "123" } }));
    await reject(base({ customer: { ...base().customer, gstin: "BAD" } }));
    await reject(base({ advance: "100000" }));
    await reject(base({ payMode: "" }));
    await reject(base({ items: [{ ...base().items[0], specs: { paper: "Cardboard" } }] }));
    await reject(base({ items: [{ ...base().items[0], specs: { evil: "x" } }] }));
    await reject(base({ items: [{ ...base().items[0], qty: "1.5" }] }));
    await reject(base({ gstRate: 7 }));
    expect((await db.select().from(counters))[0].next).toBe(3);
  });
});

describe("updateOrder / setOrderStatus", () => {
  it("replaces items and recomputes totals", async () => {
    const { id } = await createOrder(db, base());
    await updateOrder(db, id, base({ gstRate: 0, advance: "0", payMode: "", items: [{ service: "ad", specs: { newspaper: "Sandesh", adType: "Public notice" }, qty: "1", unit: "insertion", rate: "4800", hsn: "998363" }, { service: "pam", specs: { size: "A4" }, qty: "5000", unit: "pcs", rate: "1.25", hsn: "4911" }] }));
    const o = (await getOrder(db, id))!;
    expect(o).toMatchObject({ subtotal: 1105000, tax: 0, total: 1105000, advance: 0, payMode: null });
    expect(o.items.map((i) => i.service)).toEqual(["ad", "pam"]);
    expect(await db.$count(orderItems, eq(orderItems.orderId, id))).toBe(2);
    await expect(updateOrder(db, 999999, base())).rejects.toBeInstanceOf(AdminError);
  });

  it("marks done and reopens", async () => {
    const { id } = await createOrder(db, base());
    await setOrderStatus(db, id, true);
    expect((await getOrder(db, id))!.doneAt).toBeInstanceOf(Date);
    await setOrderStatus(db, id, false);
    expect(await getOrder(db, id)).toMatchObject({ status: "pending", doneAt: null });
    await expect(setOrderStatus(db, 999999, true)).rejects.toBeInstanceOf(AdminError);
  });
});

describe("listOrders / orderStats", () => {
  it("filters by tab and searches number, customer, phone and job", async () => {
    const paid = await createOrder(db, base({ customer: { ...base().customer, phone: "9000000001", name: "Shah & Sons_" }, advance: "767", items: base().items, dueOn: istToday() }));
    await setOrderStatus(db, paid.id, true);
    const nos = async (tab: Parameters<typeof listOrders>[1], q = "") => (await listOrders(db, tab, q)).map((o) => o.no);

    expect(await nos("done")).toEqual([paid.no]);
    expect(await nos("unpaid")).not.toContain(paid.no);
    expect(await nos("all", `ORD-${String(paid.no).padStart(4, "0")}`)).toEqual([paid.no]);
    expect(await nos("all", "shah &")).toEqual([paid.no]);
    expect(await nos("all", "9000000001")).toEqual([paid.no]);
    expect(await nos("all", "_")).toEqual([paid.no]);
    expect((await nos("all", "sandesh")).length).toBe(1);
    expect((await nos("all", "newspaper")).length).toBe(1);
    expect(await nos("all", "zzz")).toEqual([]);
  });

  it("aggregates counts and balance", async () => {
    const s = await orderStats(db);
    const all = await listOrders(db, "all", "");
    expect(s.all).toBe(all.length);
    expect(s.done).toBe(1);
    expect(s.doneThisMonth).toBe(1);
    expect(s.balance).toBe(all.reduce((a, o) => a + Math.max(0, o.total - o.advance), 0));
  });

  it("uses India time for today and month start", () => {
    const t = Date.UTC(2026, 9, 31, 19, 0);
    expect(istToday(t)).toBe("2026-11-01");
    expect(istMonthStart(t).toISOString()).toBe("2026-10-31T18:30:00.000Z");
  });
});
