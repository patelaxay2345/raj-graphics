import { getDb } from "@/db";
import { mediaStore, serveMedia } from "@/lib/media";

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  return serveMedia(mediaStore(getDb()), key.join("/"), request);
}
