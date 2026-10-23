import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isMediaKey, serveMedia } from "@/lib/media";

let mf: Miniflare;
let bucket: R2Bucket;

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: "export default {}", r2Buckets: ["MEDIA"] });
  bucket = (await mf.getR2Bucket("MEDIA")) as unknown as R2Bucket;
  await bucket.put("t/visiting-cards/1.jpg", new Uint8Array([1, 2, 3]), { httpMetadata: { contentType: "image/jpeg" } });
  await bucket.put("evil.png", "<script>alert(1)</script>", { httpMetadata: { contentType: "text/html" } });
});

afterAll(() => mf.dispose());

const req = (headers?: HeadersInit) => new Request("https://x/img/a", { headers });

describe("isMediaKey", () => {
  it("accepts image keys and rejects everything else", () => {
    expect(["m-hero.jpg", "cover/die-cut-cards.jpg", "t/visiting-cards/12.jpg", "d/vc/147.webp"].every(isMediaKey)).toBe(true);
    expect(["", "../x.jpg", "t/../x.jpg", "a/./b.jpg", "x.html", "x.svg", "/abs.jpg", "a//b.jpg", `${"a".repeat(600)}.jpg`].some(isMediaKey)).toBe(false);
  });
});

describe("serveMedia", () => {
  it("serves an object with type, etag and cache headers", async () => {
    const res = await serveMedia(bucket, "t/visiting-cards/1.jpg", req());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("etag")).toMatch(/^".+"$/);
    expect(res.headers.get("cache-control")).toContain("max-age=86400");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("returns 304 when the etag matches", async () => {
    const etag = (await serveMedia(bucket, "t/visiting-cards/1.jpg", req())).headers.get("etag")!;
    const res = await serveMedia(bucket, "t/visiting-cards/1.jpg", req({ "if-none-match": etag }));
    expect(res.status).toBe(304);
    expect(res.body).toBeNull();
  });

  it("returns 404 for missing objects and invalid keys", async () => {
    expect((await serveMedia(bucket, "nope.jpg", req())).status).toBe(404);
    expect((await serveMedia(bucket, "../t/visiting-cards/1.jpg", req())).status).toBe(404);
  });

  it("derives content type from the key, not stored metadata", async () => {
    const res = await serveMedia(bucket, "evil.png", req());
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
