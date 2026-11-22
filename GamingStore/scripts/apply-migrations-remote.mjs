#!/usr/bin/env node
/**
 * Applies supabase/migrations/*.sql (in filename order) to a remote Postgres
 * connection given as the first argument. Idempotent-ish: skips files whose
 * filename is already recorded in supabase_migrations.schema_migrations.
 * Dev-only tool. Usage: node scripts/apply-migrations-remote.mjs "<conn-string>"
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { fileURLToPath } from "node:url";

const conn = process.argv[2];
if (!conn) {
  console.error("Usage: node scripts/apply-migrations-remote.mjs <postgres-connection-string>");
  process.exit(1);
}

// 40001 txn page looks unknown to node-postgres when passed raw — silence needed options
const client = new pg.Client({
  connectionString: conn,
  application_name: "gamingstore-migrations",
  ssl: { rejectUnauthorized: false },
});

const migrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../supabase/migrations",
);
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

await client.connect();

const ensureHistory = await client.query(
  `create table if not exists supabase_migrations.schema_migrations (
     version text primary key,
     statements int,
     name text
   )`,
);
void ensureHistory;

const { rows: applied } = await client.query(
  "select version from supabase_migrations.schema_migrations",
);
const done = new Set(applied.map((r) => r.version));

for (const file of files) {
  const version = file.slice(0, file.indexOf("_"));
  if (done.has(version)) {
    console.log(`skip  ${file} (already applied)`);
    continue;
  }
  const sql = readFileSync(path.join(migrationsDir, file), "utf8");
  await client.query("begin");
  try {
    await client.query(sql);
    await client.query(
      "insert into supabase_migrations.schema_migrations (version, name) values ($1, $2)",
      [version, file],
    );
    await client.query("commit");
    console.log(`apply ${file}`);
  } catch (err) {
    await client.query("rollback");
    console.error(`FAILED ${file}: ${err.message}`);
    process.exitCode = 1;
    break;
  }
}

await client.end();
console.log(process.exitCode ? "ABORTED" : "MIGRATIONS COMPLETE");
