import { eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { media } from "@/db/schema";

const KEY = /^[\w-]+(?:\/[\w-][\w.-]*)*\.(?:jpe?g|png|webp)$/i;

export const isMediaKey = (key: string) => key.length <= 512 && KEY.test(key);

export const contentType = (key: string) => {
  const ext = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  return ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
};

// D1 rows are capped at 2,000,000 bytes and images are stored base64-encoded (4/3 larger).
export const MAX_MEDIA_BYTES = 1_400_000;

export type MediaStore = ReturnType<typeof mediaStore>;

export const mediaStore = (db: Db) => ({
  async put(key: string, bytes: Uint8Array) {
    if (!isMediaKey(key)) throw new Error(`invalid media key ${key}`);
    if (bytes.byteLength > MAX_MEDIA_BYTES) throw new Error("image too large");
    await db.insert(media).values({ key, contentType: contentType(key), data: Buffer.from(bytes).toString("base64"), size: bytes.byteLength });
  },
  async get(key: string) {
    const row = await db.query.media.findFirst({ where: eq(media.key, key), columns: { contentType: true, data: true } });
    return row && { contentType: row.contentType, bytes: new Uint8Array(Buffer.from(row.data, "base64")) };
  },
  async delete(keys: string | string[]) {
    const list = typeof keys === "string" ? [keys] : keys;
    for (let i = 0; i < list.length; i += 90) await db.delete(media).where(inArray(media.key, list.slice(i, i + 90)));
  },
});

// Keys are never overwritten (put is insert-only), so responses can be cached as immutable.
const HEADERS = { "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" };

export async function serveMedia(store: MediaStore, key: string, request: Request) {
  if (!isMediaKey(key)) return new Response("Not found", { status: 404 });
  const etag = `"${key}"`;
  const inm = request.headers.get("if-none-match")?.split(",").map((t) => t.trim().replace(/^W\//, "")) ?? [];
  if (inm.includes(etag) || inm.includes("*")) return new Response(null, { status: 304, headers: { ...HEADERS, etag } });

  const edge = typeof caches === "undefined" ? undefined : (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(new URL(`/img/${key}`, request.url));
  const hit = await edge?.match(cacheKey);
  if (hit) return hit;

  const obj = await store.get(key);
  if (!obj) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  const res = new Response(obj.bytes, { headers: { ...HEADERS, etag, "content-type": contentType(key) } });
  await edge?.put(cacheKey, res.clone());
  return res;
}
