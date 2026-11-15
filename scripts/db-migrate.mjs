/**
 * Applies the pending SQL migrations in /drizzle to the database at DATABASE_URL, and says what it is doing:
 * which database, which migrations are already in, each pending one as it runs (with its statements), and how it ended.
 *
 *   npm run db:migrate
 *
 * Same rules and the same record table as `drizzle-kit migrate` (drizzle.__drizzle_migrations): a migration is pending
 * when its journal time is newer than the last one recorded, and all pending migrations run in one transaction, so a
 * failure leaves the database as it was.
 */
import { readMigrationFiles } from "drizzle-orm/migrator";
import fs from "node:fs";
import postgres from "postgres";

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (color ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const dim = paint(2);
const bold = paint(1);
const green = paint(32);
const red = paint(31);
const yellow = paint(33);

const url = (process.env.DATABASE_URL?.trim() || "postgres://musickit:musickit@localhost:5433/musickit");
const parsed = new URL(url);
const host = parsed.hostname;
const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
const where = `${host}:${parsed.port || 5432}${parsed.pathname}`;
console.log(`${bold("Database")}  ${where} ${local ? dim("(local)") : yellow("(remote)")}`);

const folder = "./drizzle";
const tags = JSON.parse(fs.readFileSync(`${folder}/meta/_journal.json`, "utf8")).entries.map((e) => e.tag);
const migrations = readMigrationFiles({ migrationsFolder: folder }).map((m, i) => ({ ...m, tag: tags[i] }));

/** The first line of a statement, without comments, short enough for one terminal line. */
const summary = (stmt) => {
  const line = stmt
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("--"));
  if (!line) return "";
  return line.length > 90 ? `${line.slice(0, 87)}...` : line;
};
const ms = (start) => `${Math.round(performance.now() - start)}ms`;

const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10, onnotice: () => {} });
let current = null;
let exitCode = 0;
try {
  await sql`create schema if not exists drizzle`;
  await sql`create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`;
  const [last] = await sql`select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1`;
  const lastAt = last ? Number(last.created_at) : -Infinity;
  const pending = migrations.filter((m) => lastAt < m.folderMillis);
  const applied = migrations.filter((m) => lastAt >= m.folderMillis);

  const lastTag = applied.at(-1)?.tag;
  console.log(`${bold("Applied")}   ${applied.length} of ${migrations.length}${lastTag ? dim(`, last ${lastTag}`) : ""}`);

  if (!pending.length) {
    console.log(green("\n✓ Up to date. Nothing to apply."));
  } else {
    console.log(`${bold("Pending")}   ${pending.length}: ${pending.map((m) => m.tag).join(", ")}\n`);
    const started = performance.now();
    await sql.begin(async (tx) => {
      for (const m of pending) {
        current = { tag: m.tag, stmt: null };
        const statements = m.sql.filter((s) => s.trim());
        console.log(`${bold("→")} ${m.tag} ${dim(`(${statements.length} statement${statements.length === 1 ? "" : "s"})`)}`);
        const t = performance.now();
        for (const stmt of statements) {
          current.stmt = stmt;
          console.log(dim(`    ${summary(stmt)}`));
          await tx.unsafe(stmt);
        }
        await tx`insert into drizzle.__drizzle_migrations (hash, created_at) values (${m.hash}, ${m.folderMillis})`;
        console.log(`  ${green("✓")} ${m.tag} ${dim(ms(t))}`);
      }
    });
    current = null;
    console.log(green(`\n✓ Applied ${pending.length} migration${pending.length === 1 ? "" : "s"} to ${where} in ${ms(started)}.`));
  }
} catch (err) {
  exitCode = 1;
  console.error(red(`\n✗ Migration failed${current ? ` in ${current.tag}` : ""}. Nothing was applied: the transaction was rolled back.`));
  if (current?.stmt) console.error(`\n${bold("Statement")}\n${current.stmt.trim()}`);
  console.error(`\n${bold("Error")}     ${err.message}`);
  for (const key of ["code", "detail", "hint", "where", "table_name", "column_name", "constraint_name"]) {
    if (err[key]) console.error(`${bold(key.padEnd(9))} ${err[key]}`);
  }
  if (err.code === "ECONNREFUSED" && local) console.error(dim("\nIs the local database running? npm run db:up"));
} finally {
  await sql.end({ timeout: 5 });
}
process.exit(exitCode);
