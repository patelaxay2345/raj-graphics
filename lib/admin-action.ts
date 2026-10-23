import "server-only";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { AdminError } from "@/lib/admin-categories";
import { requireOwner } from "@/lib/owner";

export type ActionState = { error?: string; saved?: number };

export async function runAdminAction(fn: () => Promise<unknown>): Promise<ActionState> {
  await requireOwner();
  try {
    await fn();
  } catch (e) {
    if (e instanceof AdminError) return { error: e.message };
    if (e instanceof ZodError) return { error: e.issues.map((i) => i.message).join(". ") };
    throw e;
  }
  revalidatePath("/admin", "layout");
  return { saved: Date.now() };
}
