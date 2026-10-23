import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, type Db } from "@/db";
import { categories, designGroups, designs } from "@/db/schema";
import { seedCatalog } from "@/db/seed";
import { isSameOrigin } from "@/lib/auth";
import { GroupNotFoundError, addDesign, designNumbering, isWebp, readCapped } from "@/lib/designs";

const webp = new Uint8Array([...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode("WEBPVP8 ")]);

let mf: Miniflare;
let db: Db;
let bucket: R2Bucket;
let vcGroup: number;

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: "export default {}", d1Databases: ["DB"], r2Buckets: ["MEDIA"] });
  db = connect(await mf.getD1Database("DB"));
  bucket = (await mf.getR2Bucket("MEDIA")) as unknown as R2Bucket;
  await migrate(db, { migrationsFolder: "drizzle" });
  await seedCatalog(db);
  const [vc] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, "visiting-cards"));
  [{ id: vcGroup }] = await db.select({ id: designGroups.id }).from(designGroups).where(eq(designGroups.categoryId, vc.id));
});

afterAll(() => mf.dispose());

describe("designNumbering", () => {
  it("continues a dominant PREFIX-n series", () => {
    expect(designNumbering("visiting-cards", ["VC-01", "VC-146", "VC-9"])).toEqual({ designPrefix: "VC-", nextDesignNo: 147 });
  });

  it("falls back to slug initials when codes are irregular", () => {
    expect(designNumbering("die-cut-cards", ["Design 10", "Die No.2", "CAR 1"])).toEqual({ designPrefix: "DCC-", nextDesignNo: 1 });
    expect(designNumbering("pens", [])).toEqual({ designPrefix: "P-", nextDesignNo: 1 });
  });
});

describe("addDesign", () => {
  it("stores the image in R2 and appends a design with the next code", async () => {
    const d = await addDesign(db, bucket, vcGroup, webp);
    expect(d.code).toBe("VC-147");
    expect(d.imageKey).toMatch(/^t\/visiting-cards\/[0-9a-f-]{36}\.webp$/);
    const obj = await bucket.get(d.imageKey);
    expect(obj?.httpMetadata?.contentType).toBe("image/webp");
    const rows = await db.select().from(designs).where(eq(designs.groupId, vcGroup));
    const added = rows.find((r) => r.id === d.id)!;
    expect(added.sort).toBe(Math.max(...rows.filter((r) => r.id !== d.id).map((r) => r.sort)) + 1);
  });

  it("gives parallel uploads unique codes", async () => {
    const out = await Promise.all(Array.from({ length: 8 }, () => addDesign(db, bucket, vcGroup, webp)));
    expect(new Set(out.map((d) => d.code)).size).toBe(8);
    expect(out.map((d) => d.code).sort()).toEqual(Array.from({ length: 8 }, (_, i) => `VC-${148 + i}`).sort());
  });

  it("initialises numbering from existing codes on databases migrated without it", async () => {
    const [lh] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, "letter-heads"));
    await db.update(categories).set({ designPrefix: "", nextDesignNo: 1 }).where(eq(categories.id, lh.id));
    const [{ id: group }] = await db.select({ id: designGroups.id }).from(designGroups).where(eq(designGroups.categoryId, lh.id));
    const out = await Promise.all(Array.from({ length: 4 }, () => addDesign(db, bucket, group, webp)));
    expect(out.map((d) => d.code).sort()).toEqual(["LH-21", "LH-22", "LH-23", "LH-24"]);
  });

  it("rejects an unknown group without writing anything", async () => {
    const before = (await bucket.list()).objects.length;
    await expect(addDesign(db, bucket, 999999, webp)).rejects.toBeInstanceOf(GroupNotFoundError);
    expect((await bucket.list()).objects.length).toBe(before);
  });
});

describe("isWebp", () => {
  it("checks the RIFF/WEBP signature", () => {
    expect(isWebp(webp)).toBe(true);
    expect(isWebp(new TextEncoder().encode("<svg onload=alert(1)>"))).toBe(false);
    expect(isWebp(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(false);
    expect(isWebp(new Uint8Array(4))).toBe(false);
  });
});

describe("isSameOrigin", () => {
  const req = (origin?: string) => new Request("https://rajgraphics.in/api/admin/designs?group=1", { method: "POST", headers: origin ? { origin } : {} });
  it("requires an Origin matching the request URL", () => {
    expect(isSameOrigin(req("https://rajgraphics.in"))).toBe(true);
    expect(isSameOrigin(req("https://evil.example"))).toBe(false);
    expect(isSameOrigin(req("http://rajgraphics.in"))).toBe(false);
    expect(isSameOrigin(req())).toBe(false);
  });
});

describe("readCapped", () => {
  const stream = (...parts: number[]) => new ReadableStream<Uint8Array>({ start(c) { parts.forEach((n) => c.enqueue(new Uint8Array(n).fill(7))); c.close(); } });

  it("joins chunks up to the limit", async () => {
    expect((await readCapped(stream(3, 4), 7))?.byteLength).toBe(7);
    expect(await readCapped(null, 7)).toEqual(new Uint8Array());
  });

  it("stops once the body exceeds the limit", async () => {
    expect(await readCapped(stream(5, 5, 5), 7)).toBeNull();
  });
});
