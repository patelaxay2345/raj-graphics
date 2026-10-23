import { and, count, eq, gte, lt } from "drizzle-orm";
import type { Db } from "@/db";
import { loginAttempts } from "@/db/schema";
import { verifyPassword, type AuthConfig } from "@/lib/auth";

export const LOGIN_LIMITS = { windowMs: 15 * 60_000, perIp: 5, total: 30 };

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function attemptLogin(db: Db, cfg: AuthConfig, input: { email: string; password: string; ip: string }, now = Date.now()): Promise<LoginResult> {
  const since = new Date(now - LOGIN_LIMITS.windowMs);
  const [[mine], [all]] = await Promise.all([
    db.select({ n: count() }).from(loginAttempts).where(and(eq(loginAttempts.ip, input.ip), gte(loginAttempts.at, since))),
    db.select({ n: count() }).from(loginAttempts).where(gte(loginAttempts.at, since)),
  ]);
  if (mine.n >= LOGIN_LIMITS.perIp || all.n >= LOGIN_LIMITS.total) return { ok: false, error: "Too many attempts. Wait 15 minutes and try again." };

  const passwordOk = await verifyPassword(input.password.slice(0, 200), cfg.passwordHash);
  if (passwordOk && input.email.trim().toLowerCase() === cfg.ownerEmail) {
    await db.delete(loginAttempts).where(eq(loginAttempts.ip, input.ip));
    return { ok: true };
  }
  await db.batch([
    db.insert(loginAttempts).values({ ip: input.ip, at: new Date(now) }),
    db.delete(loginAttempts).where(lt(loginAttempts.at, new Date(now - 86_400_000))),
  ]);
  return { ok: false, error: "Wrong email or password." };
}
