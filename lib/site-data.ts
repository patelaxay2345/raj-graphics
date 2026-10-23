import { cache } from "react";
import { getDb } from "@/db";
import { getCategory, getCategoryCards } from "@/lib/catalog";
import { getStore } from "@/lib/settings";

export const loadCategoryCards = cache(() => getCategoryCards(getDb()));

export const loadCategory = cache((slug: string) => getCategory(getDb(), slug));

export const loadStore = cache(() => getStore(getDb()));
