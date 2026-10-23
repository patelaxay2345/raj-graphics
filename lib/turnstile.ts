const TEST_KEYS = { site: "1x00000000000000000000AA", secret: "1x0000000000000000000000000000000AA" };

export function turnstileKeys(env: { TURNSTILE_SITE_KEY?: string; TURNSTILE_SECRET_KEY?: string }, dev: boolean) {
  if (env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY) return { site: env.TURNSTILE_SITE_KEY, secret: env.TURNSTILE_SECRET_KEY };
  return dev ? TEST_KEYS : null;
}

export async function verifyTurnstile(token: string, secret: string, ip: string | null, fetchImpl: typeof fetch = fetch) {
  if (!token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
