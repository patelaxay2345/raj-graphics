import { cache } from "react";
import { getDb } from "@/db";
import { getCategory, getCategoryCards } from "@/lib/catalog";

export const loadCategoryCards = cache(() => getCategoryCards(getDb()));

export const loadCategory = cache((slug: string) => getCategory(getDb(), slug));
