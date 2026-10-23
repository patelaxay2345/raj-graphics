import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export type AccessEnv = Pick<CloudflareEnv, "ACCESS_TEAM_DOMAIN" | "ACCESS_AUD" | "OWNER_EMAIL">;
export type AccessConfig = { teamDomain: string; aud: string; ownerEmail: string };

export const ACCESS_HEADER = "cf-access-jwt-assertion";

const TEAM = /^[a-z0-9-]+\.cloudflareaccess\.com$/;

export function accessConfig(env: AccessEnv): AccessConfig | undefined {
  const teamDomain = env.ACCESS_TEAM_DOMAIN?.trim().toLowerCase();
  const aud = env.ACCESS_AUD?.trim();
  const ownerEmail = env.OWNER_EMAIL?.trim().toLowerCase();
  if (!teamDomain || !TEAM.test(teamDomain) || !aud || !ownerEmail?.includes("@")) return undefined;
  return { teamDomain, aud, ownerEmail };
}

const keySets = new Map<string, JWTVerifyGetKey>();

const remoteKeys = (teamDomain: string) => {
  let keys = keySets.get(teamDomain);
  if (!keys) keySets.set(teamDomain, (keys = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`))));
  return keys;
};

export async function verifyOwner(token: string | null | undefined, cfg: AccessConfig | undefined, keys?: JWTVerifyGetKey) {
  if (!token || !cfg) return null;
  try {
    const { payload } = await jwtVerify(token, keys ?? remoteKeys(cfg.teamDomain), {
      issuer: `https://${cfg.teamDomain}`,
      audience: cfg.aud,
      algorithms: ["RS256"],
    });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    return email === cfg.ownerEmail ? email : null;
  } catch {
    return null;
  }
}

export const isSameOrigin = (request: Request) => request.headers.get("origin") === new URL(request.url).origin;
