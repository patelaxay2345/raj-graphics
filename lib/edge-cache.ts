export const PAGE_TTL_SECONDS = 60;

const SKIP = /^\/(?:admin|api|img)(?:\/|$)/;

const decodedPath = (url: URL) => {
  try {
    return decodeURIComponent(url.pathname).toLowerCase();
  } catch {
    return null;
  }
};

const RSC_HEADERS = ["next-router-state-tree", "next-router-prefetch", "next-router-segment-prefetch", "next-url"];

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export async function pageCacheKey(request: Request) {
  if (request.method !== "GET") return null;
  if (request.headers.has("cookie") || request.headers.has("authorization")) return null;
  const url = new URL(request.url);
  const path = decodedPath(url);
  if (path === null || SKIP.test(path)) return null;
  const rsc = request.headers.get("rsc") === "1";
  if (rsc && !url.searchParams.has("_rsc")) return null;
  url.searchParams.set("__variant", rsc ? `rsc-${await sha256(RSC_HEADERS.map((h) => request.headers.get(h) ?? "").join("\n"))}` : "html");
  return new Request(url);
}

type EdgeCache = Pick<Cache, "match" | "put">;
type Ctx = { waitUntil(p: Promise<unknown>): void };

export async function withPageCache(request: Request, ctx: Ctx, cache: EdgeCache, render: () => Promise<Response>) {
  const key = await pageCacheKey(request);
  if (!key) return render();

  const hit = await cache.match(key);
  if (hit) {
    const res = new Response(hit.body, hit);
    res.headers.set("x-edge-cache", "HIT");
    return res;
  }

  const res = await render();
  if (res.status !== 200 || res.headers.has("set-cookie")) return res;
  const stored = new Response(res.clone().body, res);
  stored.headers.set("cache-control", `public, max-age=${PAGE_TTL_SECONDS}`);
  ctx.waitUntil(cache.put(key, stored));
  const out = new Response(res.body, res);
  out.headers.set("x-edge-cache", "MISS");
  return out;
}
