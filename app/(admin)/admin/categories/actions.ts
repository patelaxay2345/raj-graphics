"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import * as cat from "@/lib/admin-categories";
import { runAdminAction as run, type ActionState } from "@/lib/admin-action";

const id = z.coerce.number().int().positive();
const dir = z.enum(["-1", "1"]).transform((d) => (d === "1" ? 1 : -1) as 1 | -1);
const flag = z.enum(["active", "showOnHome"]);
const on = z.enum(["true", "false"]).transform((v) => v === "true");
const field = (fd: FormData, k: string) => String(fd.get(k) ?? "");

const details = (fd: FormData) => ({
  name: field(fd, "name"),
  slug: field(fd, "slug"),
  turnaround: field(fd, "turnaround"),
  tag: field(fd, "tag"),
  description: field(fd, "description"),
  designPrefix: field(fd, "designPrefix"),
});

export async function createCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let created = 0;
  const r = await run(async () => (created = await cat.createCategory(getDb(), details(fd))));
  if (r.error) return r;
  redirect(`/admin/categories/${created}`);
}

export const updateCategoryAction = async (_: ActionState, fd: FormData) => run(() => cat.updateCategory(getDb(), id.parse(fd.get("id")), details(fd)));

export const setFlagAction = async (_: ActionState, fd: FormData) => run(() => cat.setCategoryFlag(getDb(), id.parse(fd.get("id")), flag.parse(fd.get("flag")), on.parse(fd.get("on"))));

export const moveCategoryAction = async (_: ActionState, fd: FormData) => run(() => cat.moveCategory(getDb(), id.parse(fd.get("id")), dir.parse(fd.get("dir"))));

export async function deleteCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await run(() => cat.deleteCategory(getDb(), id.parse(fd.get("id"))));
  if (r.error) return r;
  redirect("/admin/categories");
}

const owned = (fd: FormData) => [getDb(), id.parse(fd.get("categoryId")), id.parse(fd.get("id"))] as const;

export const addVariantAction = async (_: ActionState, fd: FormData) => run(() => cat.addVariant(getDb(), id.parse(fd.get("categoryId")), { title: field(fd, "title"), feature: field(fd, "feature") }));
export const updateVariantAction = async (_: ActionState, fd: FormData) => run(() => cat.updateVariant(...owned(fd), { title: field(fd, "title"), feature: field(fd, "feature") }));
export const deleteVariantAction = async (_: ActionState, fd: FormData) => run(() => cat.deleteVariant(...owned(fd)));
export const moveVariantAction = async (_: ActionState, fd: FormData) => run(() => cat.moveVariant(...owned(fd), dir.parse(fd.get("dir"))));

export const addGroupAction = async (_: ActionState, fd: FormData) => run(() => cat.addGroup(getDb(), id.parse(fd.get("categoryId")), { title: field(fd, "title") }));
export const renameGroupAction = async (_: ActionState, fd: FormData) => run(() => cat.renameGroup(...owned(fd), { title: field(fd, "title") }));
export const deleteGroupAction = async (_: ActionState, fd: FormData) => run(() => cat.deleteGroup(...owned(fd)));
export const moveGroupAction = async (_: ActionState, fd: FormData) => run(() => cat.moveGroup(...owned(fd), dir.parse(fd.get("dir"))));
