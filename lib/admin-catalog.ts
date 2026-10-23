import { asc, count, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { categories, designGroups, designs } from "@/db/schema";

export const listDesignCategories = (db: Db) =>
  db
    .select({ id: categories.id, slug: categories.slug, name: categories.name, designs: count(designs.id) })
    .from(categories)
    .leftJoin(designGroups, eq(designGroups.categoryId, categories.id))
    .leftJoin(designs, eq(designs.groupId, designGroups.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sort), asc(categories.id));

export const getDesignCategory = (db: Db, slug: string) =>
  db.query.categories.findFirst({
    where: eq(categories.slug, slug),
    columns: { id: true, slug: true, name: true, designPrefix: true, nextDesignNo: true },
    with: {
      groups: {
        orderBy: (t, { asc }) => [asc(t.sort), asc(t.id)],
        with: { designs: { orderBy: (t, { asc }) => [asc(t.sort), asc(t.id)] } },
      },
    },
  });
