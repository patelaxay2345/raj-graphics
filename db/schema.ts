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
  designPrefix: text("design_prefix").notNull().default(""),
  nextDesignNo: integer("next_design_no").notNull().default(1),
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

const createdAt = () => integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`);

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  business: text("business").notNull().default(""),
  gstin: text("gstin").notNull().default(""),
  city: text("city").notNull().default(""),
  address: text("address").notNull().default(""),
  createdAt: createdAt(),
});

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    no: integer("no").notNull().unique(),
    customerId: integer("customer_id").notNull().references(() => customers.id),
    status: text("status", { enum: ["pending", "done"] }).notNull().default("pending"),
    dueOn: text("due_on"),
    deliveryMode: text("delivery_mode", { enum: ["pickup", "delivery", "courier"] }).notNull().default("pickup"),
    designBy: text("design_by", { enum: ["we", "customer", "edit"] }).notNull().default("we"),
    proofBy: text("proof_by", { enum: ["whatsapp", "email", "in-person"] }).notNull().default("whatsapp"),
    notes: text("notes").notNull().default(""),
    gstRate: integer("gst_rate").notNull().default(18),
    subtotal: integer("subtotal").notNull(),
    tax: integer("tax").notNull(),
    total: integer("total").notNull(),
    advance: integer("advance").notNull().default(0),
    payMode: text("pay_mode", { enum: ["upi", "cash", "bank", "cheque"] }),
    createdAt: createdAt(),
    doneAt: integer("done_at", { mode: "timestamp" }),
    updatedAt: updatedAt(),
  },
  (t) => [index("orders_status_due").on(t.status, t.dueOn), index("orders_customer").on(t.customerId)],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    service: text("service", { enum: ["vc", "inv", "ad", "pam", "oth"] }).notNull(),
    specs: text("specs", { mode: "json" }).$type<Record<string, string>>().notNull(),
    qty: integer("qty").notNull(),
    unit: text("unit").notNull(),
    rate: integer("rate").notNull(),
    hsn: text("hsn").notNull().default(""),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("order_items_order_sort").on(t.orderId, t.sort)],
);

export const counters = sqliteTable("counters", {
  series: text("series").primaryKey(),
  next: integer("next").notNull(),
});

export const customersRelations = relations(customers, ({ many }) => ({ orders: many(orders) }));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));
