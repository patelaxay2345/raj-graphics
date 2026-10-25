export type AuthEnv = Pick<CloudflareEnv, "OWNER_EMAIL" | "ADMIN_PASSWORD_HASH" | "SESSION_SECRET">;
export type AuthConfig = { ownerEmail: string; passwordHash: string; sessionSecret: string };

export const SESSION_COOKIE = "__Host-rg_admin";
export const SESSION_DAYS = 7;
// Cloudflare Workers caps PBKDF2 at 100,000 iterations.
const ITERATIONS = 100_000;
const HASH = /^pbkdf2-sha256\$(\d+)\$([\w-]+)\$([\w-]+)$/;

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");
const fromB64url = (s: string) => Uint8Array.from(Buffer.from(s, "base64url"));

export function authConfig(env: AuthEnv): AuthConfig | undefined {
  const ownerEmail = env.OWNER_EMAIL?.trim().toLowerCase();
  const passwordHash = env.ADMIN_PASSWORD_HASH?.trim();
  const sessionSecret = env.SESSION_SECRET?.trim();
  if (!ownerEmail?.includes("@") || !passwordHash || !HASH.test(passwordHash) || !sessionSecret || sessionSecret.length < 32) return undefined;
  return { ownerEmail, passwordHash, sessionSecret };
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}

const sameBytes = (a: Uint8Array, b: Uint8Array) => {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
};

export async function hashPassword(password: string, iterations = ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${iterations}$${b64url(salt)}$${b64url(await pbkdf2(password, salt, iterations))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const m = stored.match(HASH);
  if (!m || Number(m[1]) > ITERATIONS) return false;
  return sameBytes(await pbkdf2(password, fromB64url(m[2]), Number(m[1])), fromB64url(m[3]));
}

async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

// The password hash is mixed into the signature, so changing the password ends every session.
const signingInput = (cfg: AuthConfig, body: string) => `${body}.${cfg.passwordHash}`;

export async function createSession(cfg: AuthConfig, now = Date.now()) {
  const body = b64url(enc.encode(JSON.stringify({ e: cfg.ownerEmail, x: now + SESSION_DAYS * 86_400_000 })));
  return `${body}.${b64url(await hmac(cfg.sessionSecret, signingInput(cfg, body)))}`;
}

export async function verifySession(token: string | undefined, cfg: AuthConfig, now = Date.now()) {
  const [body, sig, extra] = token?.split(".") ?? [];
  if (!body || !sig || extra !== undefined) return null;
  if (!sameBytes(await hmac(cfg.sessionSecret, signingInput(cfg, body)), fromB64url(sig))) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(body, "base64url").toString()) as { e?: unknown; x?: unknown };
    return e === cfg.ownerEmail && typeof x === "number" && x > now ? e : null;
  } catch {
    return null;
  }
}

export const readCookie = (header: string | null, name: string) =>
  header
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);

export const safeNext = (next: string | null | undefined) => (next && /^\/admin(?:[/?#]|$)/.test(next) && !next.startsWith("//") ? next : "/admin");

export const isSameOrigin = (request: Request) => request.headers.get("origin") === new URL(request.url).origin;
