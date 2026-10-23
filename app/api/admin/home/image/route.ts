import { getDb } from "@/db";
import { getHome, setHeroImage } from "@/lib/home";
import { MAX_MEDIA_BYTES, mediaStore } from "@/lib/media";
import { readWebpUpload } from "@/lib/upload-guard";

export async function POST(request: Request) {
  const bytes = await readWebpUpload(request, MAX_MEDIA_BYTES);
  if (bytes instanceof Response) return bytes;

  const db = getDb();
  const store = mediaStore(db);
  const previous = (await getHome(db)).hero.imageKey;
  const key = `h/hero-${crypto.randomUUID()}.webp`;
  await store.put(key, bytes);
  try {
    await setHeroImage(db, key);
  } catch (e) {
    await store.delete(key);
    throw e;
  }
  if (previous.startsWith("h/")) await store.delete(previous);
  return Response.json({ key }, { status: 201, headers: { "cache-control": "no-store" } });
}
