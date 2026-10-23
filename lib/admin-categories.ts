import { and, asc, count, countDistinct, eq, max, ne } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { categories, designGroups, designs, testimonials, variants } from "@/db/schema";

const text = (maxLen: number) => z.string().trim().max(maxLen);

export const categorySchema = z.object({
  name: text(80).min(1, "Name is required"),
  slug: text(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens"),
  turnaround: text(40).min(1, "Turnaround is required"),
  tag: text(30).transform((v) => v || null),
  description: text(600),
  designPrefix: text(12).regex(/^[A-Z0-9]*-?$/, "Use capital letters or digits, optionally ending with -"),
});

export const variantSchema = z.object({ title: text(80).min(1, "Title is required"), feature: text(120) });

export const groupSchema = z.object({ title: text(80).min(1, "Title is required") });

export type CategoryInput = z.input<typeof categorySchema>;

export class AdminError extends Error {}

export const listAdminCategories = (db: Db) =>
  db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      turnaround: categories.turnaround,
      tag: categories.tag,
      mockupKey: categories.mockupKey,
      coverKey: categories.coverKey,
      showOnHome: categories.showOnHome,
      active: categories.active,
      designs: countDistinct(designs.id),
      variants: countDistinct(variants.id),
    })
    .from(categories)
    .leftJoin(designGroups, eq(designGroups.categoryId, categories.id))
    .leftJoin(designs, eq(designs.groupId, designGroups.id))
    .leftJoin(variants, eq(variants.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sort), asc(categories.id));

export const getAdminCategory = (db: Db, id: number) =>
  db.query.categories.findFirst({
    where: eq(categories.id, id),
    with: {
      variants: { orderBy: (t, { asc }) => [asc(t.sort), asc(t.id)] },
      groups: {
        orderBy: (t, { asc }) => [asc(t.sort), asc(t.id)],
        with: { designs: { columns: { id: true, imageKey: true }, orderBy: (t, { asc }) => [asc(t.sort), asc(t.id)] } },
      },
    },
  });

async function assertSlugFree(db: Db, slug: string, id?: number) {
  const [taken] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(id ? and(eq(categories.slug, slug), ne(categories.id, id)) : eq(categories.slug, slug));
  if (taken) throw new AdminError("Another category already uses this URL slug");
}

export async function createCategory(db: Db, input: CategoryInput) {
  const data = categorySchema.parse(input);
  await assertSlugFree(db, data.slug);
  const [{ top }] = await db.select({ top: max(categories.sort) }).from(categories);
  const [row] = await db
    .insert(categories)
    .values({
      ...data,
      designPrefix: data.designPrefix || `${data.slug.split("-").map((w) => w[0].toUpperCase()).join("")}-`,
      coverKey: "m-custom.jpg",
      sort: (top ?? -1) + 1,
      active: false,
    })
    .returning({ id: categories.id });
  return row.id;
}

export async function updateCategory(db: Db, id: number, input: CategoryInput) {
  const data = categorySchema.parse(input);
  await assertSlugFree(db, data.slug, id);
  const [row] = await db
    .update(categories)
    .set({ ...data, designPrefix: data.designPrefix || undefined, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  if (!row) throw new AdminError("Category not found");
}

export async function setCategoryFlag(db: Db, id: number, flag: "active" | "showOnHome", on: boolean) {
  const extra = flag === "showOnHome" && on ? { homeSort: ((await db.select({ top: max(categories.homeSort) }).from(categories))[0].top ?? -1) + 1 } : {};
  await db.update(categories).set({ [flag]: on, ...extra, updatedAt: new Date() }).where(eq(categories.id, id));
}

export async function setCategoryImage(db: Db, id: number, slot: "mockup" | "cover", key: string) {
  const [row] = await db
    .update(categories)
    .set({ [slot === "mockup" ? "mockupKey" : "coverKey"]: key, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  if (!row) throw new AdminError("Category not found");
}

export async function deleteCategory(db: Db, id: number) {
  const [{ n }] = await db.select({ n: count() }).from(designGroups).where(eq(designGroups.categoryId, id));
  if (n) throw new AdminError("Remove its design groups first, or hide the category instead");
  await db.delete(categories).where(eq(categories.id, id));
}

type Sortable = typeof categories | typeof variants | typeof designGroups | typeof testimonials;

export async function move(db: Db, table: Sortable, ids: number[], id: number, dir: -1 | 1) {
  const at = ids.indexOf(id);
  const to = at + dir;
  if (at < 0 || to < 0 || to >= ids.length) return;
  [ids[at], ids[to]] = [ids[to], ids[at]];
  const [first, ...rest] = ids.map((x, i) => db.update(table).set({ sort: i }).where(eq(table.id, x)));
  await db.batch([first, ...rest]);
}

export async function moveCategory(db: Db, id: number, dir: -1 | 1) {
  const rows = await db.select({ id: categories.id }).from(categories).orderBy(asc(categories.sort), asc(categories.id));
  await move(db, categories, rows.map((r) => r.id), id, dir);
}

export async function addVariant(db: Db, categoryId: number, input: z.input<typeof variantSchema>) {
  const data = variantSchema.parse(input);
  const [{ top }] = await db.select({ top: max(variants.sort) }).from(variants).where(eq(variants.categoryId, categoryId));
  await db.insert(variants).values({ ...data, categoryId, sort: (top ?? -1) + 1 });
}

export async function updateVariant(db: Db, categoryId: number, id: number, input: z.input<typeof variantSchema>) {
  await db.update(variants).set(variantSchema.parse(input)).where(and(eq(variants.id, id), eq(variants.categoryId, categoryId)));
}

export async function deleteVariant(db: Db, categoryId: number, id: number) {
  await db.delete(variants).where(and(eq(variants.id, id), eq(variants.categoryId, categoryId)));
}

export async function moveVariant(db: Db, categoryId: number, id: number, dir: -1 | 1) {
  const rows = await db.select({ id: variants.id }).from(variants).where(eq(variants.categoryId, categoryId)).orderBy(asc(variants.sort), asc(variants.id));
  await move(db, variants, rows.map((r) => r.id), id, dir);
}

export async function addGroup(db: Db, categoryId: number, input: z.input<typeof groupSchema>) {
  const data = groupSchema.parse(input);
  const [{ top }] = await db.select({ top: max(designGroups.sort) }).from(designGroups).where(eq(designGroups.categoryId, categoryId));
  await db.insert(designGroups).values({ ...data, categoryId, sort: (top ?? -1) + 1 });
}

export async function renameGroup(db: Db, categoryId: number, id: number, input: z.input<typeof groupSchema>) {
  await db.update(designGroups).set(groupSchema.parse(input)).where(and(eq(designGroups.id, id), eq(designGroups.categoryId, categoryId)));
}

export async function deleteGroup(db: Db, categoryId: number, id: number) {
  const [{ n }] = await db.select({ n: count() }).from(designs).where(eq(designs.groupId, id));
  if (n) throw new AdminError("Only empty groups can be deleted. Move or delete its designs first.");
  await db.delete(designGroups).where(and(eq(designGroups.id, id), eq(designGroups.categoryId, categoryId)));
}

export async function moveGroup(db: Db, categoryId: number, id: number, dir: -1 | 1) {
  const rows = await db.select({ id: designGroups.id }).from(designGroups).where(eq(designGroups.categoryId, categoryId)).orderBy(asc(designGroups.sort), asc(designGroups.id));
  await move(db, designGroups, rows.map((r) => r.id), id, dir);
}

export async function moveHomeCategory(db: Db, id: number, dir: -1 | 1) {
  const ids = (await db.select({ id: categories.id }).from(categories).where(eq(categories.showOnHome, true)).orderBy(asc(categories.homeSort), asc(categories.id))).map((r) => r.id);
  const at = ids.indexOf(id);
  const to = at + dir;
  if (at < 0 || to < 0 || to >= ids.length) return;
  [ids[at], ids[to]] = [ids[to], ids[at]];
  const [first, ...rest] = ids.map((x, i) => db.update(categories).set({ homeSort: i }).where(eq(categories.id, x)));
  await db.batch([first, ...rest]);
}
