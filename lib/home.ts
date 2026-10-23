import { asc, eq, max } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { settings, testimonials } from "@/db/schema";
import { AdminError, move } from "@/lib/admin-categories";
import { isMediaKey } from "@/lib/media";

const text = (maxLen: number) => z.string().trim().max(maxLen);
const line = (maxLen: number) => text(maxLen).min(1, "Fill in every highlighted field");
const pair = z.object({ title: line(40), text: text(120) });

export const homeSchema = z.object({
  hero: z.object({
    pill: text(60),
    title: line(60),
    highlight: text(60),
    text: text(300),
    imageKey: z.string().refine(isMediaKey, "Invalid image"),
    feats: z.array(z.object({ value: line(24), label: text(40) })).length(4),
  }),
  products: z.object({ title: line(60), subtitle: text(200) }),
  why: z.object({ title: line(60), subtitle: text(200), items: z.array(pair).length(4) }),
  how: z.object({ title: line(60), subtitle: text(200), steps: z.array(pair).length(5) }),
  custom: z.object({ title: line(60), highlight: text(60), text: text(200), button: line(40), checks: z.array(text(40)).length(4) }),
  best: z.object({
    title: line(60),
    subtitle: text(200),
    items: z.array(z.object({ name: text(60), imageKey: z.string().refine((k) => k === "" || isMediaKey(k), "Invalid image") })).max(8),
  }),
  reviews: z.object({ title: line(60), subtitle: text(200) }),
});

export type Home = z.output<typeof homeSchema>;
export type HomeInput = z.input<typeof homeSchema>;

export const DEFAULT_HOME: Home = {
  hero: {
    pill: "👑 Trusted by 45,000+ Customers",
    title: "High-Quality Printing",
    highlight: "for Every Business",
    text: "Premium printing at affordable prices. Share your design, get a quick quote and doorstep delivery – all in one place.",
    imageKey: "m-hero.jpg",
    feats: [
      { value: "12 Hours", label: "Fastest Turnaround" },
      { value: "Premium Quality", label: "Professional Printing" },
      { value: "Pan India", label: "Safe Delivery" },
      { value: "45,000+", label: "Happy Customers" },
    ],
  },
  products: { title: "Shop by Category", subtitle: "Choose from a wide range of printing products. Great quality, best prices and fast delivery." },
  why: {
    title: "Why Choose Raj Graphics?",
    subtitle: "We make printing simple, fast and hassle-free for businesses of all sizes.",
    items: [
      { title: "Best Prices", text: "High-quality printing at competitive rates" },
      { title: "Fast Turnaround", text: "Get your orders ready in 12 hours" },
      { title: "Premium Quality", text: "State-of-the-art printing machines for perfect results" },
      { title: "Pan India Delivery", text: "Safe and reliable delivery to your doorstep" },
    ],
  },
  how: {
    title: "How It Works",
    subtitle: "Getting your prints is quick and easy.",
    steps: [
      { title: "Choose Product", text: "Select from our wide range of printing products" },
      { title: "Share Design", text: "Send your artwork or use our design help" },
      { title: "Get Your Quote", text: "We share price and delivery time on enquiry" },
      { title: "Confirm Enquiry", text: "Approve the proof on call or WhatsApp" },
      { title: "Receive Prints", text: "High-quality prints delivered to your doorstep" },
    ],
  },
  custom: {
    title: "Custom Printing",
    highlight: "for Your Brand",
    text: "Make a lasting impression with professional printing solutions.",
    button: "Start Customized Enquiry →",
    checks: ["Custom Sizes & Shapes", "Multiple Paper Options", "Bulk Order Discounts", "Design Support Available"],
  },
  best: {
    title: "Best Selling Products",
    subtitle: "Most popular products loved by our customers.",
    items: [
      { name: "Visiting Cards", imageKey: "m-visiting.jpg" },
      { name: "Flex Banners", imageKey: "m-flex.jpg" },
      { name: "Stickers", imageKey: "m-stickers.jpg" },
      { name: "ID Cards", imageKey: "m-idcard.jpg" },
      { name: "Brochures", imageKey: "m-brochure.jpg" },
    ],
  },
  reviews: { title: "What Our Customers Say", subtitle: "Trusted by 45,000+ businesses across India." },
};

export async function getHome(db: Db): Promise<Home> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, "home") });
  const saved = row?.value as Partial<Home> | undefined;
  return { ...DEFAULT_HOME, ...saved };
}

const put = (db: Db, value: Home) => db.insert(settings).values({ key: "home", value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });

export async function saveHome(db: Db, input: HomeInput) {
  const value = homeSchema.parse(input);
  const current = await getHome(db);
  await put(db, { ...value, hero: { ...value.hero, imageKey: current.hero.imageKey } });
}

export async function setHeroImage(db: Db, key: string) {
  const home = await getHome(db);
  await put(db, { ...home, hero: { ...home.hero, imageKey: key } });
}

export const testimonialSchema = z.object({ quote: text(400).min(1, "Write the review text"), name: text(60).min(1, "Add the customer's name"), role: text(60) });

export const listTestimonials = (db: Db, onlyActive = false) =>
  db.query.testimonials.findMany({ where: onlyActive ? eq(testimonials.active, true) : undefined, orderBy: [asc(testimonials.sort), asc(testimonials.id)] });

export async function addTestimonial(db: Db, input: z.input<typeof testimonialSchema>) {
  const t = testimonialSchema.parse(input);
  const [{ top }] = await db.select({ top: max(testimonials.sort) }).from(testimonials);
  await db.insert(testimonials).values({ ...t, sort: (top ?? -1) + 1 });
}

export async function updateTestimonial(db: Db, id: number, input: z.input<typeof testimonialSchema>) {
  const [row] = await db.update(testimonials).set(testimonialSchema.parse(input)).where(eq(testimonials.id, id)).returning({ id: testimonials.id });
  if (!row) throw new AdminError("Review not found");
}

export const setTestimonialActive = (db: Db, id: number, on: boolean) => db.update(testimonials).set({ active: on }).where(eq(testimonials.id, id));

export const deleteTestimonial = (db: Db, id: number) => db.delete(testimonials).where(eq(testimonials.id, id));

export async function moveTestimonial(db: Db, id: number, dir: -1 | 1) {
  const rows = await db.select({ id: testimonials.id }).from(testimonials).orderBy(asc(testimonials.sort), asc(testimonials.id));
  await move(db, testimonials, rows.map((r) => r.id), id, dir);
}

export const bestSellers = (h: Home) => h.best.items.filter((i) => i.name && i.imageKey);
