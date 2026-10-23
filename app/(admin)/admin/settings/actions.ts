"use server";

import { getDb } from "@/db";
import { runAdminAction, type ActionState } from "@/lib/admin-action";
import { saveSeller, saveStore } from "@/lib/settings";

const KEYS = ["legalName", "gstin", "pan", "stateCode", "address", "phone", "email", "bankName", "account", "ifsc", "upi", "terms"] as const;

export const saveBillingAction = async (_: ActionState, fd: FormData) =>
  runAdminAction(() => saveSeller(getDb(), Object.fromEntries(KEYS.map((k) => [k, String(fd.get(k) ?? "")])) as Record<(typeof KEYS)[number], string>));

const STORE_KEYS = ["name", "tagline", "about", "phone", "whatsapp", "email", "address", "hours", "facebook", "instagram", "youtube", "linkedin", "seoTitle", "seoDescription"] as const;

export const saveStoreAction = async (_: ActionState, fd: FormData) =>
  runAdminAction(() => saveStore(getDb(), Object.fromEntries(STORE_KEYS.map((k) => [k, String(fd.get(k) ?? "")])) as Record<(typeof STORE_KEYS)[number], string>));
