import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { categories, designGroups, designs } from "@/db/schema";

export const MAX_THUMB_BYTES = 1_000_000;

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));

export const isWebp = (b: Uint8Array) => b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP";

export function designNumbering(slug: string, codes: string[]) {
  const counts = new Map<string, number>();
  for (const c of codes) {
    const m = c.match(/^([A-Z]+-)\d+$/);
    if (m) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  const best = [...counts].sort((a, b) => b[1] - a[1])[0];
  const prefix = best && best[1] * 2 > codes.length ? best[0] : `${slug.split("-").map((w) => w[0].toUpperCase()).join("")}-`;
  const used = codes.flatMap((c) => (c.startsWith(prefix) && /^\d+$/.test(c.slice(prefix.length)) ? [Number(c.slice(prefix.length))] : []));
  return { designPrefix: prefix, nextDesignNo: Math.max(0, ...used) + 1 };
}

export async function readCapped(body: ReadableStream<Uint8Array> | null, max: number) {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (let r = await reader.read(); !r.done; r = await reader.read()) {
    size += r.value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(r.value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

export class GroupNotFoundError extends Error {}

export async function addDesign(db: Db, bucket: R2Bucket, groupId: number, bytes: Uint8Array) {
  const group = await db.query.designGroups.findFirst({
    where: eq(designGroups.id, groupId),
    with: { category: { columns: { slug: true, designPrefix: true } } },
  });
  if (!group) throw new GroupNotFoundError();

  if (!group.category.designPrefix) {
    const existing = await db.select({ code: designs.code }).from(designs).innerJoin(designGroups, eq(designs.groupId, designGroups.id)).where(eq(designGroups.categoryId, group.categoryId));
    await db
      .update(categories)
      .set(designNumbering(group.category.slug, existing.map((d) => d.code)))
      .where(and(eq(categories.id, group.categoryId), eq(categories.designPrefix, "")));
  }

  const [n] = await db
    .update(categories)
    .set({ nextDesignNo: sql`${categories.nextDesignNo} + 1` })
    .where(eq(categories.id, group.categoryId))
    .returning({ next: categories.nextDesignNo, prefix: categories.designPrefix });
  const code = `${n.prefix}${n.next - 1}`;
  const imageKey = `t/${group.category.slug}/${crypto.randomUUID()}.webp`;

  await bucket.put(imageKey, bytes, { httpMetadata: { contentType: "image/webp" } });
  try {
    const [row] = await db
      .insert(designs)
      .values({ groupId, code, imageKey, sort: sql`(select coalesce(max(${designs.sort}), -1) + 1 from ${designs} where ${designs.groupId} = ${groupId})` })
      .returning({ id: designs.id, code: designs.code, imageKey: designs.imageKey });
    return row;
  } catch (e) {
    await bucket.delete(imageKey);
    throw e;
  }
}
