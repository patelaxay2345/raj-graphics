import { asc, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { connect, type Db } from "@/db";
import { categories, designGroups, variants } from "@/db/schema";
import { seedCatalog } from "@/db/seed";
import {
  AdminError, addGroup, addVariant, createCategory, deleteCategory, deleteGroup, deleteVariant, getAdminCategory,
  listAdminCategories, moveCategory, moveGroup, moveVariant, renameGroup, setCategoryFlag, setCategoryImage, updateCategory, updateVariant,
} from "@/lib/admin-categories";
import { getCategoryCards, homeCards } from "@/lib/catalog";

let mf: Miniflare;
let db: Db;
const idOf = async (slug: string) => (await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)))[0].id;
const base = { name: "Wedding Cards", slug: "wedding-cards", turnaround: "5 days", tag: "", description: "", designPrefix: "" };

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: "export default {}", d1Databases: ["DB"] });
  db = connect(await mf.getD1Database("DB"));
  await migrate(db, { migrationsFolder: "drizzle" });
  await seedCatalog(db);
});

afterAll(() => mf.dispose());

describe("listAdminCategories", () => {
  it("counts designs and variants without join fan-out", async () => {
    const die = (await listAdminCategories(db)).find((c) => c.slug === "die-cut-cards")!;
    expect(die.variants).toBe(4);
    expect(die.designs).toBe(48);
  });
});

describe("createCategory / updateCategory", () => {
  it("creates a hidden category at the end with a derived code prefix", async () => {
    const id = await createCategory(db, base);
    const c = (await getAdminCategory(db, id))!;
    expect(c).toMatchObject({ slug: "wedding-cards", active: false, designPrefix: "WC-", tag: null });
    expect((await listAdminCategories(db)).at(-1)?.id).toBe(id);
  });

  it("rejects duplicate slugs and invalid input", async () => {
    await expect(createCategory(db, { ...base, name: "Again" })).rejects.toBeInstanceOf(AdminError);
    await expect(createCategory(db, { ...base, slug: "Bad Slug" })).rejects.toBeInstanceOf(ZodError);
    await expect(createCategory(db, { ...base, slug: "x", name: "  " })).rejects.toBeInstanceOf(ZodError);
    await expect(updateCategory(db, await idOf("wedding-cards"), { ...base, slug: "visiting-cards" })).rejects.toBeInstanceOf(AdminError);
  });

  it("updates details, keeps its own slug and trims input", async () => {
    const id = await idOf("wedding-cards");
    await updateCategory(db, id, { ...base, name: "  Wedding Invitations ", tag: "New", description: "Foil and laser cut", designPrefix: "WI-" });
    expect(await getAdminCategory(db, id)).toMatchObject({ name: "Wedding Invitations", tag: "New", description: "Foil and laser cut", designPrefix: "WI-" });
    await expect(updateCategory(db, 999999, base)).rejects.toBeInstanceOf(AdminError);
  });
});

describe("flags, images and ordering", () => {
  it("appends a category to the end of the home grid when enabled", async () => {
    const id = await idOf("pens");
    await setCategoryFlag(db, id, "showOnHome", true);
    expect(homeCards(await getCategoryCards(db)).at(-1)?.slug).toBe("pens");
    await setCategoryFlag(db, id, "active", false);
    expect((await getCategoryCards(db)).some((c) => c.slug === "pens")).toBe(false);
    await setCategoryFlag(db, id, "active", true);
  });

  it("sets mockup and cover image keys", async () => {
    const id = await idOf("pens");
    await setCategoryImage(db, id, "mockup", "c/pens/a.webp");
    await setCategoryImage(db, id, "cover", "c/pens/b.webp");
    expect(await getAdminCategory(db, id)).toMatchObject({ mockupKey: "c/pens/a.webp", coverKey: "c/pens/b.webp" });
  });

  it("moves a category up and down and ignores moves past the ends", async () => {
    const order = async () => (await db.select({ slug: categories.slug }).from(categories).orderBy(asc(categories.sort), asc(categories.id))).map((r) => r.slug);
    const first = (await order())[0];
    await moveCategory(db, await idOf("die-cut-cards"), -1);
    expect((await order()).slice(0, 2)).toEqual(["die-cut-cards", first]);
    await moveCategory(db, await idOf("die-cut-cards"), -1);
    expect((await order())[0]).toBe("die-cut-cards");
    await moveCategory(db, await idOf("die-cut-cards"), 1);
    expect((await order()).slice(0, 2)).toEqual([first, "die-cut-cards"]);
  });
});

describe("variants and groups", () => {
  it("adds, edits, reorders and deletes variants within their category only", async () => {
    const id = await idOf("wedding-cards");
    await addVariant(db, id, { title: "Foil", feature: "Gold" });
    await addVariant(db, id, { title: "Laser", feature: "" });
    let c = (await getAdminCategory(db, id))!;
    await moveVariant(db, id, c.variants[1].id, -1);
    await updateVariant(db, id, c.variants[0].id, { title: "Gold Foil", feature: "Hot foil" });
    c = (await getAdminCategory(db, id))!;
    expect(c.variants.map((v) => v.title)).toEqual(["Laser", "Gold Foil"]);
    const other = await idOf("pens");
    await deleteVariant(db, other, c.variants[0].id);
    expect((await getAdminCategory(db, id))!.variants).toHaveLength(2);
    await deleteVariant(db, id, c.variants[0].id);
    expect((await getAdminCategory(db, id))!.variants.map((v) => v.title)).toEqual(["Gold Foil"]);
  });

  it("only deletes empty groups and categories without groups", async () => {
    const vc = await idOf("visiting-cards");
    const [full] = await db.select().from(designGroups).where(eq(designGroups.categoryId, vc));
    await expect(deleteGroup(db, vc, full.id)).rejects.toThrow(/Only empty groups/);
    await expect(deleteCategory(db, vc)).rejects.toThrow(/design groups first/);

    const id = await idOf("wedding-cards");
    await addGroup(db, id, { title: "Classic" });
    await addGroup(db, id, { title: "Modern" });
    let c = (await getAdminCategory(db, id))!;
    await moveGroup(db, id, c.groups[1].id, -1);
    await renameGroup(db, id, c.groups[0].id, { title: "Traditional" });
    c = (await getAdminCategory(db, id))!;
    expect(c.groups.map((g) => g.title)).toEqual(["Modern", "Traditional"]);
    for (const g of c.groups) await deleteGroup(db, id, g.id);
    await deleteCategory(db, id);
    expect(await getAdminCategory(db, id)).toBeUndefined();
    expect(await db.select().from(variants).where(eq(variants.categoryId, id))).toEqual([]);
  });
});
