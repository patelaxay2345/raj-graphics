import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, type Db } from "@/db";
import { authConfig, createSession, hashPassword, isSameOrigin, readCookie, safeNext, verifyPassword, verifySession, type AuthConfig } from "@/lib/auth";
import { LOGIN_LIMITS, attemptLogin } from "@/lib/login";

let cfg: AuthConfig;
let mf: Miniflare;
let db: Db;
const SECRET = "s".repeat(40);

beforeAll(async () => {
  cfg = { ownerEmail: "owner@example.com", passwordHash: await hashPassword("correct horse battery", 1000), sessionSecret: SECRET };
  mf = new Miniflare({ modules: true, script: "export default {}", d1Databases: ["DB"] });
  db = connect(await mf.getD1Database("DB"));
  await migrate(db, { migrationsFolder: "drizzle" });
});

afterAll(() => mf.dispose());

describe("authConfig", () => {
  it("needs owner email, a well-formed hash and a long session secret, else fails closed", () => {
    const env = { OWNER_EMAIL: " Owner@Example.com ", ADMIN_PASSWORD_HASH: cfg.passwordHash, SESSION_SECRET: SECRET };
    expect(authConfig(env)).toEqual({ ownerEmail: "owner@example.com", passwordHash: cfg.passwordHash, sessionSecret: SECRET });
    expect(authConfig({ ...env, OWNER_EMAIL: undefined })).toBeUndefined();
    expect(authConfig({ ...env, ADMIN_PASSWORD_HASH: "plaintext" })).toBeUndefined();
    expect(authConfig({ ...env, SESSION_SECRET: "short" })).toBeUndefined();
  });
});

describe("passwords", () => {
  it("hashes with a random salt and verifies only the right password", async () => {
    const a = await hashPassword("pw-123456", 1000);
    const b = await hashPassword("pw-123456", 1000);
    expect(a).toMatch(/^pbkdf2-sha256\$1000\$[\w-]{22}\$[\w-]{43}$/);
    expect(a).not.toBe(b);
    expect(await verifyPassword("pw-123456", a)).toBe(true);
    expect(await verifyPassword("pw-123457", a)).toBe(false);
    expect(await verifyPassword("pw-123456", "garbage")).toBe(false);
    expect(await verifyPassword("pw-123456", a.replace("$1000$", "$999999$"))).toBe(false);
  });
});

describe("sessions", () => {
  it("accepts a fresh session and rejects tampered, expired, foreign or stale-password sessions", async () => {
    const now = Date.now();
    const t = await createSession(cfg, now);
    expect(await verifySession(t, cfg, now)).toBe("owner@example.com");
    expect(await verifySession(t, cfg, now + 8 * 86_400_000)).toBeNull();
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ e: "owner@example.com", x: now + 1e12 })).toString("base64url");
    expect(await verifySession(`${forged}.${sig}`, cfg, now)).toBeNull();
    expect(await verifySession(`${body}.${sig}x`, cfg, now)).toBeNull();
    expect(await verifySession(`${body}.${sig}.x`, cfg, now)).toBeNull();
    expect(await verifySession(undefined, cfg, now)).toBeNull();
    expect(await verifySession(t, { ...cfg, sessionSecret: "t".repeat(40) }, now)).toBeNull();
    expect(await verifySession(t, { ...cfg, passwordHash: await hashPassword("new password", 1000) }, now)).toBeNull();
    expect(await verifySession(t, { ...cfg, ownerEmail: "someone@else.com" }, now)).toBeNull();
  });

  it("reads cookies and only redirects back into the admin", () => {
    expect(readCookie("a=1; __Host-rg_admin=tok.sig; b=2", "__Host-rg_admin")).toBe("tok.sig");
    expect(readCookie("x__Host-rg_admin=bad", "__Host-rg_admin")).toBeUndefined();
    expect(readCookie(null, "x")).toBeUndefined();
    for (const [n, want] of [["/admin/orders?t=all", "/admin/orders?t=all"], ["/admin", "/admin"], ["//evil.com", "/admin"], ["https://evil.com/admin", "/admin"], ["/administrator", "/admin"], ["/c/x", "/admin"], [undefined, "/admin"]] as const) expect(safeNext(n)).toBe(want);
    expect(isSameOrigin(new Request("https://a.dev/x", { headers: { origin: "https://a.dev" } }))).toBe(true);
    expect(isSameOrigin(new Request("https://a.dev/x", { headers: { origin: "https://evil.dev" } }))).toBe(false);
  });
});

describe("attemptLogin", () => {
  it("logs in the owner, rejects wrong email or password and locks an IP after repeated failures", async () => {
    const t = Date.now();
    expect(await attemptLogin(db, cfg, { email: " OWNER@example.com ", password: "correct horse battery", ip: "1.1.1.1" }, t)).toEqual({ ok: true });
    expect(await attemptLogin(db, cfg, { email: "owner@example.com", password: "nope", ip: "2.2.2.2" }, t)).toEqual({ ok: false, error: "Wrong email or password." });
    expect(await attemptLogin(db, cfg, { email: "x@example.com", password: "correct horse battery", ip: "2.2.2.2" }, t)).toMatchObject({ ok: false });
    for (let i = 2; i < LOGIN_LIMITS.perIp; i++) await attemptLogin(db, cfg, { email: "owner@example.com", password: "nope", ip: "2.2.2.2" }, t);
    const locked = await attemptLogin(db, cfg, { email: "owner@example.com", password: "correct horse battery", ip: "2.2.2.2" }, t);
    expect(locked).toEqual({ ok: false, error: "Too many attempts. Wait 15 minutes and try again." });
    expect(await attemptLogin(db, cfg, { email: "owner@example.com", password: "correct horse battery", ip: "3.3.3.3" }, t)).toEqual({ ok: true });
    expect(await attemptLogin(db, cfg, { email: "owner@example.com", password: "correct horse battery", ip: "2.2.2.2" }, t + LOGIN_LIMITS.windowMs + 1)).toEqual({ ok: true });
  });

  it("locks everyone once total failures across IPs hit the global limit", async () => {
    const t = Date.now() + 10 * LOGIN_LIMITS.windowMs;
    for (let i = 0; i < LOGIN_LIMITS.total; i++) await attemptLogin(db, cfg, { email: "owner@example.com", password: "nope", ip: `10.0.0.${i}` }, t);
    expect(await attemptLogin(db, cfg, { email: "owner@example.com", password: "correct horse battery", ip: "9.9.9.9" }, t)).toMatchObject({ ok: false, error: expect.stringContaining("Too many") });
  });
});
