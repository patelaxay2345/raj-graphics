import { and, asc, eq, inArray, max, or } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { categories, designGroups, designs, variants } from "@/db/schema";
import { AdminError } from "@/lib/admin-categories";

// D1 allows at most 100 bound parameters per statement; the category check binds each key twice.
const CHUNK = 45;

export const designIdsSchema = z
  .array(z.number().int().positive())
  .min(1, "Select at least one design")
  .max(1000)
  .transform((a) => [...new Set(a)]);

const chunks = <T,>(list: T[]) => Array.from({ length: Math.ceil(list.length / CHUNK) }, (_, i) => list.slice(i * CHUNK, (i + 1) * CHUNK));

async function groupDesigns(db: Db, groupId: number, ids: number[]) {
  const rows = await db.select({ id: designs.id, imageKey: designs.imageKey }).from(designs).where(eq(designs.groupId, groupId)).orderBy(asc(designs.sort), asc(designs.id));
  const wanted = new Set(ids);
  const picked = rows.filter((r) => wanted.has(r.id));
  if (picked.length !== wanted.size) throw new AdminError("Some designs changed in another tab. Reload and try again.");
  return { rows, picked };
}

export async function setDesignsActive(db: Db, groupId: number, input: number[], on: boolean) {
  const ids = designIdsSchema.parse(input);
  await groupDesigns(db, groupId, ids);
  const [first, ...rest] = chunks(ids).map((c) => db.update(designs).set({ active: on }).where(and(eq(designs.groupId, groupId), inArray(designs.id, c))));
  await db.batch([first, ...rest]);
}

export async function moveDesigns(db: Db, groupId: number, input: number[], toGroupId: number) {
  const ids = designIdsSchema.parse(input);
  if (toGroupId === groupId) throw new AdminError("Pick a different group");
  const groups = await db.select({ id: designGroups.id, categoryId: designGroups.categoryId }).from(designGroups).where(inArray(designGroups.id, [groupId, toGroupId]));
  const from = groups.find((g) => g.id === groupId);
  const to = groups.find((g) => g.id === toGroupId);
  if (!from || !to || from.categoryId !== to.categoryId) throw new AdminError("Designs can only move to a group in the same category");
  const { picked } = await groupDesigns(db, groupId, ids);
  const [{ top }] = await db.select({ top: max(designs.sort) }).from(designs).where(eq(designs.groupId, toGroupId));
  const [first, ...rest] = picked.map((d, i) => db.update(designs).set({ groupId: toGroupId, sort: (top ?? -1) + 1 + i }).where(and(eq(designs.id, d.id), eq(designs.groupId, groupId))));
  await db.batch([first, ...rest]);
}

export async function deleteDesigns(db: Db, bucket: R2Bucket, groupId: number, input: number[]) {
  const ids = designIdsSchema.parse(input);
  const { picked } = await groupDesigns(db, groupId, ids);
  const [first, ...rest] = chunks(ids).map((c) => db.delete(designs).where(and(eq(designs.groupId, groupId), inArray(designs.id, c))));
  await db.batch([first, ...rest]);
  const keys = [...new Set(picked.map((d) => d.imageKey).filter((k) => k.startsWith("t/")))];
  const used = new Set<string>();
  for (const c of chunks(keys)) {
    const [a, b, d] = await db.batch([
      db.select({ k: designs.imageKey }).from(designs).where(inArray(designs.imageKey, c)),
      db.select({ k: variants.imageKey }).from(variants).where(inArray(variants.imageKey, c)),
      db.select({ m: categories.mockupKey, c: categories.coverKey }).from(categories).where(or(inArray(categories.mockupKey, c), inArray(categories.coverKey, c))),
    ]);
    for (const k of [...a.map((r) => r.k), ...b.map((r) => r.k), ...d.flatMap((r) => [r.m, r.c])]) if (k) used.add(k);
  }
  const orphaned = keys.filter((k) => !used.has(k));
  if (orphaned.length) await bucket.delete(orphaned);
}

export async function reorderDesigns(db: Db, groupId: number, input: number[]) {
  const ids = designIdsSchema.parse(input);
  const { rows } = await groupDesigns(db, groupId, ids);
  if (rows.length !== ids.length) throw new AdminError("Some designs changed in another tab. Reload and try again.");
  const [first, ...rest] = ids.map((id, sort) => db.update(designs).set({ sort }).where(and(eq(designs.id, id), eq(designs.groupId, groupId))));
  await db.batch([first, ...rest]);
}
