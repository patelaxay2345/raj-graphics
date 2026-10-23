import { asc, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { connect, type Db } from "@/db";
import { categories, designGroups, designs } from "@/db/schema";
import { seedCatalog } from "@/db/seed";
import { AdminError } from "@/lib/admin-categories";
import { deleteDesigns, moveDesigns, reorderDesigns, setDesignsActive } from "@/lib/admin-designs";
import { getCategory } from "@/lib/catalog";
import { addDesign } from "@/lib/designs";

const webp = new Uint8Array([...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode("WEBPVP8 ")]);

let mf: Miniflare;
let db: Db;
let bucket: R2Bucket;
const groupsOf = async (slug: string) =>
  db.select({ id: designGroups.id }).from(designGroups).innerJoin(categories, eq(categories.id, designGroups.categoryId)).where(eq(categories.slug, slug)).orderBy(asc(designGroups.sort));
const idsIn = async (groupId: number) => (await db.select({ id: designs.id }).from(designs).where(eq(designs.groupId, groupId)).orderBy(asc(designs.sort), asc(designs.id))).map((d) => d.id);

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: "export default {}", d1Databases: ["DB"], r2Buckets: ["MEDIA"] });
  db = connect(await mf.getD1Database("DB"));
  bucket = (await mf.getR2Bucket("MEDIA")) as unknown as R2Bucket;
  await migrate(db, { migrationsFolder: "drizzle" });
  await seedCatalog(db);
});

afterAll(() => mf.dispose());

describe("setDesignsActive", () => {
  it("hides and shows selected designs, more than one D1 parameter chunk at a time", async () => {
    const [g] = await groupsOf("visiting-cards");
    const ids = await idsIn(g.id);
    expect(ids.length).toBeGreaterThan(100);
    await setDesignsActive(db, g.id, ids, false);
    expect((await getCategory(db, "visiting-cards"))!.groups).toHaveLength(0);
    await setDesignsActive(db, g.id, ids.slice(0, 2), true);
    expect((await getCategory(db, "visiting-cards"))!.groups[0].designs.map((d) => d.id)).toEqual(ids.slice(0, 2));
    await setDesignsActive(db, g.id, ids, true);
  });

  it("rejects ids from another group and empty selections", async () => {
    const [vc] = await groupsOf("visiting-cards");
    const [lh] = await groupsOf("letter-heads");
    const [foreign] = await idsIn(lh.id);
    await expect(setDesignsActive(db, vc.id, [foreign], false)).rejects.toBeInstanceOf(AdminError);
    await expect(setDesignsActive(db, vc.id, [], false)).rejects.toBeInstanceOf(ZodError);
    expect((await db.select({ active: designs.active }).from(designs).where(eq(designs.id, foreign)))[0].active).toBe(true);
  });
});

describe("moveDesigns", () => {
  it("appends to the end of a sibling group, keeping their current order", async () => {
    const [, a, b] = await groupsOf("die-cut-cards");
    const from = await idsIn(a.id);
    const before = await idsIn(b.id);
    await moveDesigns(db, a.id, [from[2], from[0]], b.id);
    expect(await idsIn(b.id)).toEqual([...before, from[0], from[2]]);
    expect(await idsIn(a.id)).toEqual(from.filter((id) => id !== from[0] && id !== from[2]));
  });

  it("refuses other categories and the same group", async () => {
    const [vc] = await groupsOf("visiting-cards");
    const [lh] = await groupsOf("letter-heads");
    const [id] = await idsIn(vc.id);
    await expect(moveDesigns(db, vc.id, [id], lh.id)).rejects.toBeInstanceOf(AdminError);
    await expect(moveDesigns(db, vc.id, [id], vc.id)).rejects.toBeInstanceOf(AdminError);
    expect(await idsIn(vc.id)).toContain(id);
  });
});

describe("reorderDesigns", () => {
  it("writes the full new order", async () => {
    const [g] = await groupsOf("letter-heads");
    const ids = await idsIn(g.id);
    const next = [...ids].reverse();
    await reorderDesigns(db, g.id, next);
    expect(await idsIn(g.id)).toEqual(next);
  });

  it("rejects partial or foreign lists", async () => {
    const [g] = await groupsOf("letter-heads");
    const [vc] = await groupsOf("visiting-cards");
    const ids = await idsIn(g.id);
    await expect(reorderDesigns(db, g.id, ids.slice(1))).rejects.toBeInstanceOf(AdminError);
    await expect(reorderDesigns(db, g.id, [...ids.slice(1), (await idsIn(vc.id))[0]])).rejects.toBeInstanceOf(AdminError);
    expect(await idsIn(g.id)).toEqual(ids);
  });
});

describe("deleteDesigns", () => {
  it("removes rows and R2 objects no other row still uses", async () => {
    const [g] = await groupsOf("envelopes");
    const uploaded = await addDesign(db, bucket, g.id, webp);
    const [seeded, sharer] = await idsIn(g.id);
    const seedKey = (await db.select({ k: designs.imageKey }).from(designs).where(eq(designs.id, seeded)))[0].k;
    const shared = "t/envelopes/shared.webp";
    const [twin] = await idsIn((await groupsOf("envelopes"))[0].id).then((ids) => ids.filter((id) => id !== seeded && id !== sharer && id !== uploaded.id));
    await db.update(designs).set({ imageKey: shared }).where(eq(designs.id, sharer));
    await db.update(designs).set({ imageKey: shared }).where(eq(designs.id, twin));
    await Promise.all([seedKey, shared].map((k) => bucket.put(k, webp)));

    await deleteDesigns(db, bucket, g.id, [uploaded.id, seeded, sharer]);
    const left = await idsIn(g.id);
    expect(left).not.toContain(uploaded.id);
    expect(left).not.toContain(seeded);
    expect(left).toContain(twin);
    expect(await bucket.head(uploaded.imageKey)).toBeNull();
    expect(await bucket.head(seedKey)).toBeNull();
    expect(await bucket.head(shared)).not.toBeNull();
  });

  it("deletes nothing when any id is outside the group", async () => {
    const [g] = await groupsOf("envelopes");
    const [vc] = await groupsOf("visiting-cards");
    const ids = await idsIn(g.id);
    await expect(deleteDesigns(db, bucket, g.id, [ids[0], (await idsIn(vc.id))[0]])).rejects.toBeInstanceOf(AdminError);
    expect(await idsIn(g.id)).toEqual(ids);
  });
});
