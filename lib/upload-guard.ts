import "server-only";
import { isSameOrigin } from "@/lib/auth";
import { isWebp, readCapped } from "@/lib/designs";
import { checkOwner } from "@/lib/owner";

export const fail = (status: number, error: string) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

export async function readWebpUpload(request: Request, maxBytes: number): Promise<Uint8Array | Response> {
  if (!("email" in (await checkOwner(request.headers)))) return fail(403, "Forbidden");
  if (!isSameOrigin(request)) return fail(403, "Cross-origin request");
  if (request.headers.get("content-type") !== "image/webp") return fail(415, "Expected image/webp");
  if (Number(request.headers.get("content-length")) > maxBytes) return fail(413, "Image too large");
  const bytes = await readCapped(request.body, maxBytes);
  if (!bytes) return fail(413, "Image too large");
  if (!isWebp(bytes)) return fail(415, "Not a WebP image");
  return bytes;
}
