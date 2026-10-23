import { describe, expect, it, vi } from "vitest";
import { PAGE_TTL_SECONDS, pageCacheKey, withPageCache } from "@/lib/edge-cache";

const req = (path: string, init?: RequestInit) => new Request(`https://raj.example${path}`, init);

function fakeCache() {
  const store = new Map<string, Response>();
  return {
    store,
    match: vi.fn(async (r: RequestInfo | URL) => store.get(new Request(r).url)?.clone()),
    put: vi.fn(async (r: RequestInfo | URL, res: Response) => void store.set(new Request(r).url, res)),
  };
}

const ctx = () => {
  const pending: Promise<unknown>[] = [];
  return { waitUntil: (p: Promise<unknown>) => void pending.push(p), flush: () => Promise.all(pending) };
};

describe("pageCacheKey", () => {
  it("caches anonymous GET pages and keeps HTML and RSC variants apart", async () => {
    expect((await pageCacheKey(req("/c/visiting-cards")))?.url).toBe("https://raj.example/c/visiting-cards?__variant=html");
    expect((await pageCacheKey(req("/?q=card")))?.url).toBe("https://raj.example/?q=card&__variant=html");
    const rsc = (state: string, prefetch?: string) => pageCacheKey(req("/c/pens?_rsc=abc", { headers: { rsc: "1", "next-router-state-tree": state, ...(prefetch && { "next-router-prefetch": prefetch }) } }));
    const a = (await rsc("tree-a"))!.url;
    expect(a).toMatch(/^https:\/\/raj\.example\/c\/pens\?_rsc=abc&__variant=rsc-[0-9a-f]{32}$/);
    expect((await rsc("tree-a"))!.url).toBe(a);
    expect((await rsc("tree-b"))!.url).not.toBe(a);
    expect((await rsc("tree-a", "1"))!.url).not.toBe(a);
  });

  it("never caches admin, api, images, non-GET, credentialed or unhashed RSC requests", async () => {
    for (const path of ["/admin", "/admin/orders", "/%61dmin", "/ADMIN/x", "/api/admin/designs", "/img/m-hero.jpg", "/%E0%A4%A"]) expect(await pageCacheKey(req(path))).toBeNull();
    expect(await pageCacheKey(req("/", { method: "POST" }))).toBeNull();
    expect(await pageCacheKey(req("/", { method: "HEAD" }))).toBeNull();
    expect(await pageCacheKey(req("/", { headers: { cookie: "a=1" } }))).toBeNull();
    expect(await pageCacheKey(req("/", { headers: { authorization: "Bearer x" } }))).toBeNull();
    expect(await pageCacheKey(req("/c/pens", { headers: { rsc: "1" } }))).toBeNull();
    expect(await pageCacheKey(req("/administrator"))).not.toBeNull();
  });
});

describe("withPageCache", () => {
  it("renders once, then serves the cached copy with a short TTL", async () => {
    const cache = fakeCache();
    const render = vi.fn(async () => new Response("<h1>Home</h1>", { headers: { "content-type": "text/html", "cache-control": "private, no-store" } }));
    const c = ctx();
    const first = await withPageCache(req("/"), c, cache, render);
    await c.flush();
    expect(first.headers.get("x-edge-cache")).toBe("MISS");
    expect(first.headers.get("cache-control")).toBe("private, no-store");
    expect(await first.text()).toBe("<h1>Home</h1>");
    expect(cache.store.get("https://raj.example/?__variant=html")?.headers.get("cache-control")).toBe(`public, max-age=${PAGE_TTL_SECONDS}`);

    const second = await withPageCache(req("/"), ctx(), cache, render);
    expect(second.headers.get("x-edge-cache")).toBe("HIT");
    expect(await second.text()).toBe("<h1>Home</h1>");
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("does not store errors, redirects or responses that set cookies, and bypasses private paths", async () => {
    const cache = fakeCache();
    for (const res of [new Response("nf", { status: 404 }), new Response(null, { status: 308, headers: { location: "/x" } }), new Response("x", { headers: { "set-cookie": "s=1" } })]) {
      const c = ctx();
      expect((await withPageCache(req("/c/x"), c, cache, async () => res)).status).toBe(res.status);
      await c.flush();
    }
    expect(cache.put).not.toHaveBeenCalled();
    const render = vi.fn(async () => new Response("admin"));
    await withPageCache(req("/admin"), ctx(), cache, render);
    expect(cache.match).toHaveBeenCalledTimes(3);
    expect(render).toHaveBeenCalledOnce();
  });
});
