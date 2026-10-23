import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories } from "@/db/schema";
import { setCategoryImage } from "@/lib/admin-categories";
import { MAX_MEDIA_BYTES, mediaStore } from "@/lib/media";
import { fail, readWebpUpload } from "@/lib/upload-guard";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slot = new URL(request.url).searchParams.get("slot");
  const bytes = await readWebpUpload(request, MAX_MEDIA_BYTES);
  if (bytes instanceof Response) return bytes;
  if (!/^[1-9]\d{0,8}$/.test(id)) return fail(400, "Invalid category");
  if (slot !== "mockup" && slot !== "cover") return fail(400, "Invalid slot");

  const db = getDb();
  const [cat] = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.id, Number(id)));
  if (!cat) return fail(404, "Category not found");

  const key = `c/${cat.slug}/${slot}-${crypto.randomUUID()}.webp`;
  const store = mediaStore(db);
  await store.put(key, bytes);
  try {
    await setCategoryImage(db, Number(id), slot, key);
  } catch (e) {
    await store.delete(key);
    throw e;
  }
  return Response.json({ key }, { status: 201, headers: { "cache-control": "no-store" } });
}
