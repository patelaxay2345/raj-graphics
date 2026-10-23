import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { getHome, setHeroImage } from "@/lib/home";
import { readWebpUpload } from "@/lib/upload-guard";

const MAX_BYTES = 2_000_000;

export async function POST(request: Request) {
  const bytes = await readWebpUpload(request, MAX_BYTES);
  if (bytes instanceof Response) return bytes;

  const db = getDb();
  const bucket = getCloudflareContext().env.MEDIA;
  const previous = (await getHome(db)).hero.imageKey;
  const key = `h/hero-${crypto.randomUUID()}.webp`;
  await bucket.put(key, bytes, { httpMetadata: { contentType: "image/webp" } });
  try {
    await setHeroImage(db, key);
  } catch (e) {
    await bucket.delete(key);
    throw e;
  }
  if (previous.startsWith("h/")) await bucket.delete(previous);
  return Response.json({ key }, { status: 201, headers: { "cache-control": "no-store" } });
}
