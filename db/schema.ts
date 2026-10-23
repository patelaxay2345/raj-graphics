import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const updatedAt = () => integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`);

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  turnaround: text("turnaround").notNull(),
  tag: text("tag"),
  mockupKey: text("mockup_key"),
  coverKey: text("cover_key").notNull(),
  sort: integer("sort").notNull().default(0),
  showOnHome: integer("show_on_home", { mode: "boolean" }).notNull().default(false),
  homeSort: integer("home_sort").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  updatedAt: updatedAt(),
});

export const variants = sqliteTable(
  "variants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    feature: text("feature").notNull().default(""),
    imageKey: text("image_key"),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("variants_category_sort").on(t.categoryId, t.sort)],
);

export const designGroups = sqliteTable(
  "design_groups",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("design_groups_category_sort").on(t.categoryId, t.sort)],
);

export const designs = sqliteTable(
  "designs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    groupId: integer("group_id").notNull().references(() => designGroups.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    imageKey: text("image_key").notNull(),
    sort: integer("sort").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [index("designs_group_sort").on(t.groupId, t.sort)],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  variants: many(variants),
  groups: many(designGroups),
}));

export const variantsRelations = relations(variants, ({ one }) => ({
  category: one(categories, { fields: [variants.categoryId], references: [categories.id] }),
}));

export const designGroupsRelations = relations(designGroups, ({ one, many }) => ({
  category: one(categories, { fields: [designGroups.categoryId], references: [categories.id] }),
  designs: many(designs),
}));

export const designsRelations = relations(designs, ({ one }) => ({
  group: one(designGroups, { fields: [designs.groupId], references: [designGroups.id] }),
}));
