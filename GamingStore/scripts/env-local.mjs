#!/usr/bin/env node
/**
 * Generates/refreshes .env.local from `supabase status -o env` for the local
 * stack. Preserves an existing KEY_ENCRYPTION_SECRET (generates one via
 * crypto.randomBytes when absent), and never overwrites other local edits
 * beyond the managed keys.
 *
 * Usage: npm run env:local   (requires `supabase start` to be up)
 */
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const envPath = path.resolve(root, ".env.local");

const existing = new Map();
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?\s*$/);
    if (m) existing.set(m[1], m[2]);
  }
}

// NOTE: PowerShell (Windows) writes CLI warnings to stderr; execFileSync with
// stdio pipe returns clean stdout for the KEY="..." lines.
let out;
try {
  out = execSync("supabase status -o env", {
    cwd: root,
    stdio: ["ignore", "pipe", "ignore"],
    encoding: "utf8",
  });
} catch {
  console.error("Could not run `supabase status` — is the local stack started? (npm run db:start)");
  process.exit(1);
}

const status = new Map();
for (const line of out.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?\s*$/);
  if (m) status.set(m[1], m[2]);
}

let encryptionSecret = existing.get("KEY_ENCRYPTION_SECRET");
if (!encryptionSecret) {
  encryptionSecret = randomBytes(32).toString("hex");
  console.log("Generated new KEY_ENCRYPTION_SECRET (32-byte hex).");
} else {
  console.log("Kept existing KEY_ENCRYPTION_SECRET.");
}

const env = {
  NEXT_PUBLIC_SUPABASE_URL: status.get("API_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.get("ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: status.get("SERVICE_ROLE_KEY"),
  NEXT_PUBLIC_SITE_URL: existing.get("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000",
  KEY_ENCRYPTION_SECRET: encryptionSecret,
};

if (Object.values(env).some((v) => !v)) {
  console.error("Missing values from `supabase status` — aborting to avoid writing a broken .env.local.");
  process.exit(1);
}

const banner =
  "# Local development environment — generated from `supabase start` output.\n" +
  "# NEVER commit real credentials; .env.local is git-ignored.\n";
const body = Object.entries(env)
  .map(([k, v]) => `${k}=${v}`)
  .join("\n");

writeFileSync(envPath, `${banner}\n${body}\n`);
console.log(`Wrote ${path.relative(process.cwd(), envPath)}`);
