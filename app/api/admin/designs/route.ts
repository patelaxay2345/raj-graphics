import { getDb } from "@/db";
import { GroupNotFoundError, MAX_THUMB_BYTES, addDesign } from "@/lib/designs";
import { mediaStore } from "@/lib/media";
import { fail, readWebpUpload } from "@/lib/upload-guard";

export async function POST(request: Request) {
  const group = new URL(request.url).searchParams.get("group") ?? "";
  const bytes = await readWebpUpload(request, MAX_THUMB_BYTES);
  if (bytes instanceof Response) return bytes;
  if (!/^[1-9]\d{0,8}$/.test(group)) return fail(400, "Invalid group");

  try {
    const db = getDb();
    const design = await addDesign(db, mediaStore(db), Number(group), bytes);
    return Response.json(design, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof GroupNotFoundError) return fail(404, "Group not found");
    throw e;
  }
}
