import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: updatedAt(),
});

export type Seller = {
  legalName: string;
  gstin: string;
  pan: string;
  stateCode: string;
  address: string;
  phone: string;
  email: string;
  bankName: string;
  account: string;
  ifsc: string;
  upi: string;
  terms: string;
};

export const invoices = sqliteTable(
  "invoices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id").notNull().references(() => orders.id),
    status: text("status", { enum: ["draft", "issued", "paid"] }).notNull().default("draft"),
    fy: text("fy"),
    seq: integer("seq"),
    issuedOn: text("issued_on"),
    billName: text("bill_name").notNull(),
    billGstin: text("bill_gstin").notNull().default(""),
    billAddress: text("bill_address").notNull().default(""),
    placeOfSupply: text("place_of_supply").notNull(),
    seller: text("seller", { mode: "json" }).$type<Seller>(),
    gstRate: integer("gst_rate").notNull(),
    taxable: integer("taxable").notNull(),
    cgst: integer("cgst").notNull(),
    sgst: integer("sgst").notNull(),
    igst: integer("igst").notNull(),
    roundOff: integer("round_off").notNull(),
    total: integer("total").notNull(),
    advance: integer("advance").notNull().default(0),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
    paidAt: integer("paid_at", { mode: "timestamp" }),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("invoices_fy_seq").on(t.fy, t.seq), uniqueIndex("invoices_order").on(t.orderId), index("invoices_status").on(t.status)],
);

export const invoiceItems = sqliteTable(
  "invoice_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    hsn: text("hsn").notNull().default(""),
    qty: integer("qty").notNull(),
    unit: text("unit").notNull(),
    rate: integer("rate").notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("invoice_items_invoice_sort").on(t.invoiceId, t.sort)],
);

export const challans = sqliteTable(
  "challans",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id").notNull().references(() => orders.id),
    status: text("status", { enum: ["draft", "issued", "delivered"] }).notNull().default("draft"),
    fy: text("fy"),
    seq: integer("seq"),
    issuedOn: text("issued_on"),
    deliverTo: text("deliver_to").notNull(),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull().default(""),
    mode: text("mode", { enum: ["pickup", "delivery", "courier"] }).notNull(),
    vehicle: text("vehicle").notNull().default(""),
    purpose: text("purpose", { enum: ["supply", "job-work", "sample", "part"] }).notNull().default("supply"),
    returnable: integer("returnable", { mode: "boolean" }).notNull().default(false),
    seller: text("seller", { mode: "json" }).$type<Seller>(),
    createdAt: createdAt(),
    deliveredAt: integer("delivered_at", { mode: "timestamp" }),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("challans_fy_seq").on(t.fy, t.seq), index("challans_order").on(t.orderId), index("challans_status").on(t.status)],
);

export const challanItems = sqliteTable(
  "challan_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    challanId: integer("challan_id").notNull().references(() => challans.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    qty: integer("qty").notNull(),
    unit: text("unit").notNull(),
    packing: text("packing").notNull().default(""),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("challan_items_challan_sort").on(t.challanId, t.sort)],
);

export const challansRelations = relations(challans, ({ one, many }) => ({
  order: one(orders, { fields: [challans.orderId], references: [orders.id] }),
  items: many(challanItems),
}));

export const challanItemsRelations = relations(challanItems, ({ one }) => ({
  challan: one(challans, { fields: [challanItems.challanId], references: [challans.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  order: one(orders, { fields: [invoices.orderId], references: [orders.id] }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

export const enquiries = sqliteTable(
  "enquiries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    source: text("source", { enum: ["quote", "contact"] }).notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    product: text("product").notNull().default(""),
    qty: text("qty").notNull().default(""),
    city: text("city").notNull().default(""),
    message: text("message").notNull().default(""),
    status: text("status", { enum: ["new", "quoted", "won", "lost"] }).notNull().default("new"),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("enquiries_status_created").on(t.status, t.createdAt), index("enquiries_phone_created").on(t.phone, t.createdAt)],
);

export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ip: text("ip").notNull(),
    at: integer("at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("login_attempts_ip_at").on(t.ip, t.at), index("login_attempts_at").on(t.at)],
);

export const media = sqliteTable("media", {
  key: text("key").primaryKey(),
  contentType: text("content_type").notNull(),
  data: text("data").notNull(),
  size: integer("size").notNull(),
  createdAt: createdAt(),
});

export const testimonials = sqliteTable(
  "testimonials",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    quote: text("quote").notNull(),
    name: text("name").notNull(),
    role: text("role").notNull().default(""),
    sort: integer("sort").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("testimonials_sort").on(t.sort)],
);

export const customersRelations = relations(customers, ({ many }) => ({ orders: many(orders) }));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  items: many(orderItems),
  invoices: many(invoices),
  challans: many(challans),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));
