import { getCloudflareContext } from "@opennextjs/cloudflare";
import { serveMedia } from "@/lib/media";

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  return serveMedia(getCloudflareContext().env.MEDIA, key.join("/"), request);
}
