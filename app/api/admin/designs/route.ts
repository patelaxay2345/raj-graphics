import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { isSameOrigin } from "@/lib/auth";
import { GroupNotFoundError, MAX_THUMB_BYTES, addDesign, isWebp, readCapped } from "@/lib/designs";
import { checkOwner } from "@/lib/owner";

const fail = (status: number, error: string) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  if (!("email" in (await checkOwner(request.headers)))) return fail(403, "Forbidden");
  if (!isSameOrigin(request)) return fail(403, "Cross-origin request");

  const group = new URL(request.url).searchParams.get("group") ?? "";
  if (!/^[1-9]\d{0,8}$/.test(group)) return fail(400, "Invalid group");
  if (request.headers.get("content-type") !== "image/webp") return fail(415, "Expected image/webp");
  if (Number(request.headers.get("content-length")) > MAX_THUMB_BYTES) return fail(413, "Image too large");

  const bytes = await readCapped(request.body, MAX_THUMB_BYTES);
  if (!bytes) return fail(413, "Image too large");
  if (!isWebp(bytes)) return fail(415, "Not a WebP image");

  try {
    const design = await addDesign(getDb(), getCloudflareContext().env.MEDIA, Number(group), bytes);
    return Response.json(design, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof GroupNotFoundError) return fail(404, "Group not found");
    throw e;
  }
}
