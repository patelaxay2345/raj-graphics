import { and, asc, count, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { categories, designGroups, designs } from "@/db/schema";

export type CategoryCard = Awaited<ReturnType<typeof getCategoryCards>>[number];

export const getCategoryCards = (db: Db) =>
  db
    .select({
      slug: categories.slug,
      name: categories.name,
      turnaround: categories.turnaround,
      tag: categories.tag,
      mockupKey: categories.mockupKey,
      coverKey: categories.coverKey,
      showOnHome: categories.showOnHome,
      homeSort: categories.homeSort,
      designs: count(designs.id),
    })
    .from(categories)
    .leftJoin(designGroups, eq(designGroups.categoryId, categories.id))
    .leftJoin(designs, and(eq(designs.groupId, designGroups.id), eq(designs.active, true)))
    .where(eq(categories.active, true))
    .groupBy(categories.id)
    .orderBy(asc(categories.sort), asc(categories.id));

export const homeCards = (cards: CategoryCard[]) => cards.filter((c) => c.showOnHome).sort((a, b) => a.homeSort - b.homeSort);

export async function getCategory(db: Db, slug: string) {
  const c = await db.query.categories.findFirst({
    where: (t, { and, eq }) => and(eq(t.slug, slug), eq(t.active, true)),
    with: {
      variants: { orderBy: (t, { asc }) => [asc(t.sort), asc(t.id)] },
      groups: {
        orderBy: (t, { asc }) => [asc(t.sort), asc(t.id)],
        with: { designs: { where: (t, { eq }) => eq(t.active, true), orderBy: (t, { asc }) => [asc(t.sort), asc(t.id)] } },
      },
    },
  });
  if (!c) return undefined;

  const groups = c.groups.filter((g) => g.designs.length);
  const all = groups.flatMap((g) => g.designs);
  const variants = c.variants.map((v, j) => ({
    ...v,
    img: v.imageKey || (all.length ? all[Math.floor((j * all.length) / c.variants.length)].imageKey : undefined) || c.mockupKey || c.coverKey,
  }));
  return { ...c, groups, variants };
}

export type CategoryDetail = NonNullable<Awaited<ReturnType<typeof getCategory>>>;

export type Product = { key: string; t: string; img: string; group: string; f?: string; design?: boolean };

export const products = (c: CategoryDetail): Product[] => [
  ...c.groups.flatMap((g) => g.designs.map((d) => ({ key: `d${d.id}`, t: d.code, img: d.imageKey, group: g.title, design: true }))),
  ...c.variants.map((v) => ({ key: `v${v.id}`, t: v.title, f: v.feature, img: v.img, group: `${c.name} variants` })),
];
