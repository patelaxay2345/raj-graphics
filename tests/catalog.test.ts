import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import templates from "@/data/templates.json";
import { connect, type Db } from "@/db";
import { categories, designs, variants } from "@/db/schema";
import { catalogRows, seedCatalog } from "@/db/seed";
import { getCategory, getCategoryCards, homeCards, products } from "@/lib/catalog";
import { isFitImage } from "@/lib/site";

const TPL: Record<string, { items: string[][] }[]> = templates;
const tplCount = (slug: string) => (TPL[slug] ?? []).reduce((a, g) => a + g.items.length, 0);

let mf: Miniflare;
let db: Db;

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: "export default {}", d1Databases: ["DB"] });
  db = connect(await mf.getD1Database("DB"));
  await migrate(db, { migrationsFolder: "drizzle" });
  await seedCatalog(db);
});

afterAll(() => mf.dispose());

describe("seedCatalog", () => {
  it("inserts every category, variant, group and design", async () => {
    const r = catalogRows();
    expect(await db.$count(categories)).toBe(r.cats.length);
    expect(await db.$count(designs)).toBe(Object.keys(TPL).reduce((a, s) => a + tplCount(s), 0));
  });

  it("refuses to seed a non-empty database", async () => {
    await expect(seedCatalog(db)).rejects.toThrow(/not empty/);
  });
});

describe("getCategoryCards", () => {
  it("counts designs per category like the static site", async () => {
    const cards = await getCategoryCards(db);
    expect(cards).toHaveLength(17);
    for (const c of cards) expect(c.designs, c.slug).toBe(tplCount(c.slug));
  });

  it("orders home cards by home position", async () => {
    expect(homeCards(await getCategoryCards(db)).map((c) => c.slug)).toEqual([
      "visiting-cards", "die-cut-cards", "letter-heads", "envelopes", "bill-books", "bags", "files", "uv-texture", "tags", "stickers", "id-cards",
    ]);
  });

  it("skips inactive designs and categories", async () => {
    const [first] = await db.select().from(designs).where(eq(designs.code, "VC-01"));
    await db.update(designs).set({ active: false }).where(eq(designs.id, first.id));
    await db.update(categories).set({ active: false }).where(eq(categories.slug, "targets"));
    const cards = await getCategoryCards(db);
    expect(cards.find((c) => c.slug === "visiting-cards")?.designs).toBe(tplCount("visiting-cards") - 1);
    expect(cards.some((c) => c.slug === "targets")).toBe(false);
    expect(await getCategory(db, "targets")).toBeUndefined();
    await db.update(designs).set({ active: true }).where(eq(designs.id, first.id));
    await db.update(categories).set({ active: true }).where(eq(categories.slug, "targets"));
  });
});

describe("getCategory", () => {
  it("returns undefined for an unknown slug", async () => {
    expect(await getCategory(db, "nope")).toBeUndefined();
  });

  it("falls back to a design image for variants without one", async () => {
    const c = (await getCategory(db, "die-cut-cards"))!;
    const all = c.groups.flatMap((g) => g.designs);
    expect(c.variants.map((v) => v.title)).toEqual(["Custom Die Shape", "Metal Die-cut", "Rounded Die", "Leaf & Badge Dies"]);
    expect(c.variants[0].img).toBe(all[0].imageKey);
    expect(c.variants[1].img).toBe("v-metal.jpg");
    expect(c.variants[2].img).toBe(all[Math.floor((2 * all.length) / c.variants.length)].imageKey);
  });

  it("keeps fallback images within the designs when there are more than four variants", async () => {
    const c = (await getCategory(db, "die-cut-cards"))!;
    await db.insert(variants).values({ categoryId: c.id, title: "Extra", sort: 9 });
    const after = (await getCategory(db, "die-cut-cards"))!;
    const keys = after.groups.flatMap((g) => g.designs.map((d) => d.imageKey));
    expect(keys).toContain(after.variants.at(-1)!.img);
    await db.delete(variants).where(eq(variants.title, "Extra"));
  });

  it("uses the mockup when a category has no designs", async () => {
    const c = (await getCategory(db, "pamphlets"))!;
    expect(c.groups).toEqual([]);
    expect(c.variants.every((v) => v.img === "m-poster.jpg")).toBe(true);
  });

  it("lists designs then variants with unique stable keys", async () => {
    const c = (await getCategory(db, "letter-heads"))!;
    const list = products(c);
    expect(list).toHaveLength(tplCount("letter-heads") + 4);
    expect(new Set(list.map((p) => p.key)).size).toBe(list.length);
    expect(list[0]).toMatchObject({ key: expect.stringMatching(/^d\d+$/), design: true });
    expect(list.at(-1)).toMatchObject({ key: expect.stringMatching(/^v\d+$/), t: "Wedding Stationery", img: "v-wedding.jpg" });
  });
});

describe("isFitImage", () => {
  it("contains mockups and template thumbnails, crops photos", () => {
    expect(["t/a/1.jpg", "m-poster.jpg", "cover/x.jpg"].every(isFitImage)).toBe(true);
    expect(isFitImage("v-metal.jpg")).toBe(false);
  });
});
