import { cache } from "react";
import { getDb } from "@/db";
import { getCategory, getCategoryCards } from "@/lib/catalog";
import { getHome, listTestimonials } from "@/lib/home";
import { getStore } from "@/lib/settings";

export const loadCategoryCards = cache(() => getCategoryCards(getDb()));

export const loadCategory = cache((slug: string) => getCategory(getDb(), slug));

export const loadStore = cache(() => getStore(getDb()));

export const loadHome = cache(async () => {
  const db = getDb();
  const [home, reviews] = await Promise.all([getHome(db), listTestimonials(db, true)]);
  return { home, reviews };
});
