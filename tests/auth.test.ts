import { SignJWT, UnsecuredJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { accessConfig, verifyOwner, type AccessConfig } from "@/lib/auth";

const cfg: AccessConfig = { teamDomain: "rajgraphics.cloudflareaccess.com", aud: "aud-tag", ownerEmail: "owner@example.com" };

let keys: JWTVerifyGetKey;
let privateKey: CryptoKey;
let otherKey: CryptoKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair("RS256")).privateKey;
  keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256" }] });
});

const sign = (claims: Record<string, unknown> = {}, opts: { key?: CryptoKey; iss?: string; aud?: string; exp?: string | number } = {}) =>
  new SignJWT({ email: "owner@example.com", ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuer(opts.iss ?? `https://${cfg.teamDomain}`)
    .setAudience(opts.aud ?? cfg.aud)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? "1h")
    .sign(opts.key ?? privateKey);

describe("verifyOwner", () => {
  it("accepts a valid Access token for the owner", async () => {
    expect(await verifyOwner(await sign(), cfg, keys)).toBe("owner@example.com");
  });

  it("compares email case-insensitively", async () => {
    expect(await verifyOwner(await sign({ email: "Owner@Example.com" }), cfg, keys)).toBe("owner@example.com");
  });

  it("rejects missing token or config", async () => {
    expect(await verifyOwner(null, cfg, keys)).toBeNull();
    expect(await verifyOwner("", cfg, keys)).toBeNull();
    expect(await verifyOwner(await sign(), undefined, keys)).toBeNull();
  });

  it("rejects another user, wrong audience, wrong issuer and expired tokens", async () => {
    expect(await verifyOwner(await sign({ email: "someone@example.com" }), cfg, keys)).toBeNull();
    expect(await verifyOwner(await sign({ email: undefined }), cfg, keys)).toBeNull();
    expect(await verifyOwner(await sign({}, { aud: "other-app" }), cfg, keys)).toBeNull();
    expect(await verifyOwner(await sign({}, { iss: "https://evil.cloudflareaccess.com" }), cfg, keys)).toBeNull();
    expect(await verifyOwner(await sign({}, { exp: Math.floor(Date.now() / 1000) - 60 }), cfg, keys)).toBeNull();
  });

  it("rejects forged and tampered tokens", async () => {
    expect(await verifyOwner(await sign({}, { key: otherKey }), cfg, keys)).toBeNull();
    const [h, , s] = (await sign()).split(".");
    const body = Buffer.from(JSON.stringify({ email: "owner@example.com", aud: cfg.aud, iss: `https://${cfg.teamDomain}`, exp: 9e9 })).toString("base64url");
    expect(await verifyOwner(`${h}.${body}.${s}`, cfg, keys)).toBeNull();
    const none = new UnsecuredJWT({ email: "owner@example.com" }).setIssuer(`https://${cfg.teamDomain}`).setAudience(cfg.aud).setExpirationTime("1h").encode();
    expect(await verifyOwner(none, cfg, keys)).toBeNull();
    const hs = await new SignJWT({ email: "owner@example.com" }).setProtectedHeader({ alg: "HS256" }).setIssuer(`https://${cfg.teamDomain}`).setAudience(cfg.aud).setExpirationTime("1h").sign(new TextEncoder().encode("x".repeat(32)));
    expect(await verifyOwner(hs, cfg, keys)).toBeNull();
    expect(await verifyOwner("not.a.jwt", cfg, keys)).toBeNull();
  });
});

describe("accessConfig", () => {
  const env = { ACCESS_TEAM_DOMAIN: " RajGraphics.cloudflareaccess.com ", ACCESS_AUD: "aud-tag", OWNER_EMAIL: "Owner@Example.com" };

  it("normalises a complete config", () => {
    expect(accessConfig(env)).toEqual(cfg);
  });

  it("fails closed on missing or malformed values", () => {
    expect(accessConfig({})).toBeUndefined();
    expect(accessConfig({ ...env, ACCESS_AUD: " " })).toBeUndefined();
    expect(accessConfig({ ...env, OWNER_EMAIL: "owner" })).toBeUndefined();
    expect(accessConfig({ ...env, ACCESS_TEAM_DOMAIN: "evil.com" })).toBeUndefined();
    expect(accessConfig({ ...env, ACCESS_TEAM_DOMAIN: "x.cloudflareaccess.com.evil.com" })).toBeUndefined();
    expect(accessConfig({ ...env, ACCESS_TEAM_DOMAIN: "https://x.cloudflareaccess.com" })).toBeUndefined();
  });
});
