const KEY = /^[\w-]+(?:\/[\w-][\w.-]*)*\.(?:jpe?g|png|webp)$/i;

export const isMediaKey = (key: string) => key.length <= 512 && KEY.test(key);

export const contentType = (key: string) => {
  const ext = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  return ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
};

const CACHE = "public, max-age=86400, stale-while-revalidate=604800";

export async function serveMedia(bucket: R2Bucket, key: string, request: Request) {
  if (!isMediaKey(key)) return new Response("Not found", { status: 404 });
  const etag = request.headers.get("if-none-match")?.replace(/^W\//, "").replaceAll('"', "");
  const obj = await bucket.get(key, etag ? { onlyIf: { etagDoesNotMatch: etag } } : undefined);
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = { etag: obj.httpEtag, "content-type": contentType(key), "cache-control": CACHE, "x-content-type-options": "nosniff" };
  if (!("body" in obj)) return new Response(null, { status: 304, headers });
  return new Response(obj.body, { headers });
}
