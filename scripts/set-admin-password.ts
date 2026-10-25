import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { hashPassword } from "@/lib/auth";

function ask(question: string) {
  return new Promise<string>((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const quiet = rl as unknown as { _writeToOutput: (s: string) => void };
    quiet._writeToOutput = (s) => process.stdout.write(s.startsWith(question) ? s : "");
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

function wrangler(args: string[], input?: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn("pnpm", ["exec", "wrangler", ...args], { stdio: ["pipe", "pipe", "inherit"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`wrangler ${args.join(" ")} exited with ${code}`))));
    child.stdin.end(input ?? "");
  });
}

const password = await ask("New admin password (min 12 characters): ");
if (password.length < 12) throw new Error("Password must be at least 12 characters");
if ((await ask("Repeat password: ")) !== password) throw new Error("Passwords do not match");

await wrangler(["secret", "put", "ADMIN_PASSWORD_HASH"], await hashPassword(password));
console.log("Saved the password hash. Existing sessions are signed out.");

const existing = JSON.parse(await wrangler(["secret", "list", "--format", "json"])) as { name: string }[];
if (!existing.some((s) => s.name === "SESSION_SECRET")) {
  await wrangler(["secret", "put", "SESSION_SECRET"], Buffer.from(crypto.getRandomValues(new Uint8Array(48))).toString("base64url"));
  console.log("Created a session signing secret.");
}
