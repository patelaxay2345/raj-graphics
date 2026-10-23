"use server";

import { getDb } from "@/db";
import { runAdminAction, type ActionState } from "@/lib/admin-action";
import { saveSeller } from "@/lib/settings";

const KEYS = ["legalName", "gstin", "pan", "stateCode", "address", "phone", "email", "bankName", "account", "ifsc", "upi", "terms"] as const;

export const saveBillingAction = async (_: ActionState, fd: FormData) =>
  runAdminAction(() => saveSeller(getDb(), Object.fromEntries(KEYS.map((k) => [k, String(fd.get(k) ?? "")])) as Record<(typeof KEYS)[number], string>));
