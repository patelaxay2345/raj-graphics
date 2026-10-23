import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect } from "@/db";
import { MAX_MEDIA_BYTES, isMediaKey, mediaStore, serveMedia, type MediaStore } from "@/lib/media";

let mf: Miniflare;
let store: MediaStore;

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: "export default {}", d1Databases: ["DB"] });
  const db = connect(await mf.getD1Database("DB"));
  await migrate(db, { migrationsFolder: "drizzle" });
  store = mediaStore(db);
  await store.put("t/visiting-cards/1.jpg", new Uint8Array([1, 2, 3]));
  await store.put("evil.png", new TextEncoder().encode("<script>alert(1)</script>"));
});

afterAll(() => mf.dispose());

const req = (headers?: HeadersInit) => new Request("https://x/img/a", { headers });

describe("isMediaKey", () => {
  it("accepts image keys and rejects everything else", () => {
    expect(["m-hero.jpg", "cover/die-cut-cards.jpg", "t/visiting-cards/12.jpg", "d/vc/147.webp"].every(isMediaKey)).toBe(true);
    expect(["", "../x.jpg", "t/../x.jpg", "a/./b.jpg", "x.html", "x.svg", "/abs.jpg", "a//b.jpg", `${"a".repeat(600)}.jpg`].some(isMediaKey)).toBe(false);
  });
});

describe("mediaStore", () => {
  it("round-trips binary data, never overwrites, deletes in bulk and enforces limits", async () => {
    const bytes = Uint8Array.from({ length: 300_000 }, (_, i) => (i * 7) % 256);
    await store.put("h/hero-a.webp", bytes);
    expect((await store.get("h/hero-a.webp"))?.bytes).toEqual(bytes);
    await expect(store.put("h/hero-a.webp", new Uint8Array([9]))).rejects.toThrow();
    expect((await store.get("h/hero-a.webp"))?.bytes).toEqual(bytes);

    const many = Array.from({ length: 120 }, (_, i) => `x/${i}.webp`);
    for (const k of many) await store.put(k, new Uint8Array([1]));
    await store.delete([...many, "h/hero-a.webp"]);
    expect(await Promise.all([...many.slice(0, 3), many.at(-1)!, "h/hero-a.webp"].map((k) => store.get(k)))).toEqual([undefined, undefined, undefined, undefined, undefined]);

    await expect(store.put("../x.webp", new Uint8Array([1]))).rejects.toThrow("invalid media key");
    await expect(store.put("big.webp", new Uint8Array(MAX_MEDIA_BYTES + 1))).rejects.toThrow("too large");
    await store.put("max.webp", new Uint8Array(MAX_MEDIA_BYTES));
    expect((await store.get("max.webp"))?.bytes.byteLength).toBe(MAX_MEDIA_BYTES);
  });
});

describe("serveMedia", () => {
  it("serves an object with type, etag and immutable cache headers", async () => {
    const res = await serveMedia(store, "t/visiting-cards/1.jpg", req());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("etag")).toBe('"t/visiting-cards/1.jpg"');
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("returns 304 when the etag matches", async () => {
    const etag = (await serveMedia(store, "t/visiting-cards/1.jpg", req())).headers.get("etag")!;
    const res = await serveMedia(store, "t/visiting-cards/1.jpg", req({ "if-none-match": `W/${etag}` }));
    expect(res.status).toBe(304);
    expect(res.body).toBeNull();
    expect((await serveMedia(store, "t/visiting-cards/1.jpg", req({ "if-none-match": `"other", ${etag}` }))).status).toBe(304);
    expect((await serveMedia(store, "t/visiting-cards/1.jpg", req({ "if-none-match": "*" }))).status).toBe(304);
    expect((await serveMedia(store, "t/visiting-cards/1.jpg", req({ "if-none-match": '"other"' }))).status).toBe(200);
  });

  it("returns 404 for missing objects and invalid keys", async () => {
    expect((await serveMedia(store, "nope.jpg", req())).status).toBe(404);
    expect((await serveMedia(store, "../t/visiting-cards/1.jpg", req())).status).toBe(404);
  });

  it("derives content type from the key", async () => {
    const res = await serveMedia(store, "evil.png", req());
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
