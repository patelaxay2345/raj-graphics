"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { SESSION_COOKIE, SESSION_DAYS, authConfig, createSession, safeNext } from "@/lib/auth";
import { attemptLogin } from "@/lib/login";

export type LoginState = { error?: string };

export async function loginAction(_: LoginState, fd: FormData): Promise<LoginState> {
  const cfg = authConfig(getCloudflareContext().env);
  if (!cfg) return { error: "Admin login is not configured yet." };
  const ip = (await headers()).get("cf-connecting-ip") ?? "unknown";
  const r = await attemptLogin(getDb(), cfg, { email: String(fd.get("email") ?? ""), password: String(fd.get("password") ?? ""), ip });
  if (!r.ok) return { error: r.error };
  (await cookies()).set(SESSION_COOKIE, await createSession(cfg), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86_400 });
  redirect(safeNext(String(fd.get("next") ?? "")));
}

export async function logoutAction() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/", secure: true });
  redirect("/admin/login");
}
