import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { ACCESS_HEADER, accessConfig, verifyOwner } from "@/lib/auth";

export type OwnerCheck = { email: string } | { error: "unconfigured" | "forbidden" };

export async function checkOwner(h: Headers): Promise<OwnerCheck> {
  const { env } = await getCloudflareContext({ async: true });
  if (process.env.NODE_ENV === "development" && env.ADMIN_DEV_EMAIL) return { email: env.ADMIN_DEV_EMAIL };
  const cfg = accessConfig(env);
  if (!cfg) return { error: "unconfigured" };
  const email = await verifyOwner(h.get(ACCESS_HEADER), cfg);
  return email ? { email } : { error: "forbidden" };
}

export async function requireOwner() {
  const r = await checkOwner(await headers());
  if (!("email" in r)) throw new Error("Unauthorized");
  return r.email;
}
