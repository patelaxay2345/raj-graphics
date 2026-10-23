import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { connect, type Db } from "@/db";
import { seedCatalog } from "@/db/seed";
import { moveHomeCategory, setCategoryFlag } from "@/lib/admin-categories";
import { getCategoryCards, homeCards } from "@/lib/catalog";
import { formObject } from "@/lib/form-object";
import { DEFAULT_HOME, addTestimonial, bestSellers, deleteTestimonial, getHome, listTestimonials, moveTestimonial, saveHome, setHeroImage, setTestimonialActive, updateTestimonial, type HomeInput } from "@/lib/home";

let mf: Miniflare;
let db: Db;

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: "export default {}", d1Databases: ["DB"] });
  db = connect(await mf.getD1Database("DB"));
  await migrate(db, { migrationsFolder: "drizzle" });
  await seedCatalog(db);
});

afterAll(() => mf.dispose());

describe("formObject", () => {
  it("builds nested objects and arrays from dotted names and ignores unsafe keys", () => {
    const fd = new FormData();
    fd.set("hero.title", "Hi");
    fd.set("hero.feats.0.value", "12h");
    fd.set("hero.feats.1.value", "Pan India");
    fd.set("custom.checks.0", "A");
    fd.set("__proto__.polluted", "x");
    fd.set("constructor.prototype.x", "y");
    fd.set("a..b", "z");
    fd.set("$ACTION_ID_abc", "");
    const o = formObject(fd) as { hero: { title: string; feats: { value: string }[] }; custom: { checks: string[] } };
    expect(o.hero.title).toBe("Hi");
    expect(o.hero.feats.map((f) => f.value)).toEqual(["12h", "Pan India"]);
    expect(o.custom.checks).toEqual(["A"]);
    expect(Object.keys(o).sort()).toEqual(["custom", "hero"]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
});

describe("home content", () => {
  it("defaults to the current copy, saves edits, keeps the hero image and slot positions, and hides incomplete best sellers", async () => {
    expect(await getHome(db)).toEqual(DEFAULT_HOME);
    await setHeroImage(db, "h/hero-1.webp");
    const input: HomeInput = {
      ...DEFAULT_HOME,
      hero: { ...DEFAULT_HOME.hero, title: " Printing for Surat ", imageKey: "m-hero.jpg" },
      best: { ...DEFAULT_HOME.best, items: [{ name: "Visiting Cards", imageKey: "m-visiting.jpg" }, { name: "", imageKey: "m-flex.jpg" }, { name: "Pens", imageKey: "" }] },
    };
    await saveHome(db, input);
    const h = await getHome(db);
    expect(h.hero).toMatchObject({ title: "Printing for Surat", imageKey: "h/hero-1.webp" });
    expect(h.best.items).toHaveLength(3);
    expect(bestSellers(h)).toEqual([{ name: "Visiting Cards", imageKey: "m-visiting.jpg" }]);
  });

  it("rejects malformed content", async () => {
    const bad = (over: Partial<HomeInput>) => expect(saveHome(db, { ...DEFAULT_HOME, ...over })).rejects.toBeInstanceOf(ZodError);
    await bad({ hero: { ...DEFAULT_HOME.hero, title: "" } });
    await bad({ hero: { ...DEFAULT_HOME.hero, feats: DEFAULT_HOME.hero.feats.slice(0, 3) } });
    await bad({ best: { ...DEFAULT_HOME.best, items: [{ name: "X", imageKey: "../../etc/passwd" }] } });
    await bad({ how: { ...DEFAULT_HOME.how, steps: [...DEFAULT_HOME.how.steps, { title: "Six", text: "" }] } });
  });

  it("reorders and toggles home categories", async () => {
    const before = homeCards(await getCategoryCards(db)).map((c) => c.slug);
    const cards = await db.query.categories.findMany({ columns: { id: true, slug: true } });
    const id = (slug: string) => cards.find((c) => c.slug === slug)!.id;
    await moveHomeCategory(db, id(before[1]), -1);
    expect(homeCards(await getCategoryCards(db)).map((c) => c.slug).slice(0, 2)).toEqual([before[1], before[0]]);
    await setCategoryFlag(db, id("pens"), "showOnHome", true);
    expect(homeCards(await getCategoryCards(db)).at(-1)?.slug).toBe("pens");
    await setCategoryFlag(db, id("pens"), "showOnHome", false);
  });
});

describe("testimonials", () => {
  it("adds, edits, hides, reorders and deletes", async () => {
    await addTestimonial(db, { quote: " Great cards ", name: "Asha", role: "Clinic" });
    await addTestimonial(db, { quote: "Fast", name: "Ravi", role: "" });
    await expect(addTestimonial(db, { quote: "", name: "X", role: "" })).rejects.toBeInstanceOf(ZodError);
    let all = await listTestimonials(db);
    expect(all.map((t) => [t.name, t.quote])).toEqual([["Asha", "Great cards"], ["Ravi", "Fast"]]);

    await moveTestimonial(db, all[1].id, -1);
    await updateTestimonial(db, all[0].id, { quote: "Great cards!", name: "Asha P", role: "Clinic owner" });
    await setTestimonialActive(db, all[1].id, false);
    all = await listTestimonials(db);
    expect(all.map((t) => t.name)).toEqual(["Asha P", "Ravi"].reverse());
    expect((await listTestimonials(db, true)).map((t) => t.name)).toEqual(["Asha P"]);

    await deleteTestimonial(db, all[0].id);
    expect(await listTestimonials(db)).toHaveLength(1);
  });
});
