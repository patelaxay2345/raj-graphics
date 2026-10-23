import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import { getPlatformProxy } from "wrangler";
import { contentType, isMediaKey } from "@/lib/media";

const ROOT = "db/seed-img";
const BUCKET = "raj-graphics-media";
const remote = process.argv.includes("--remote");

const files = (await readdir(ROOT, { recursive: true, withFileTypes: true }))
  .filter((f) => f.isFile())
  .map((f) => join(f.parentPath, f.name))
  .map((path) => ({ path, key: relative(ROOT, path).split("\\").join("/") }));

const bad = files.filter((f) => !isMediaKey(f.key));
if (bad.length) throw new Error(`invalid media keys: ${bad.map((f) => f.key).join(", ")}`);

if (remote) {
  const run = promisify(execFile);
  const queue = [...files];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let f = queue.shift(); f; f = queue.shift()) {
        await run("pnpm", ["exec", "wrangler", "r2", "object", "put", `${BUCKET}/${f.key}`, "--file", f.path, "--content-type", contentType(f.key), "--remote"]);
      }
    }),
  );
} else {
  const { env, dispose } = await getPlatformProxy<CloudflareEnv>();
  try {
    for (const f of files) await env.MEDIA.put(f.key, await readFile(f.path), { httpMetadata: { contentType: contentType(f.key) } });
  } finally {
    await dispose();
  }
}
console.log(`uploaded ${files.length} images to ${remote ? "remote" : "local"} R2`);
