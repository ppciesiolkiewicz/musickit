/**
 * Empties the database at DATABASE_URL: drops every table, type and migration record by dropping the public schema and
 * making it again. Run `npm run db:migrate` afterwards to get the tables back.
 *
 *   npm run db:wipe
 *
 * It refuses a database that isn't on localhost unless you pass --yes-really, so a stray DATABASE_URL in the shell
 * can't wipe production.
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const host = new URL(url).hostname;
const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
if (!local && !process.argv.includes("--yes-really")) {
  console.error(`Refusing to wipe ${host}: it isn't localhost. Pass --yes-really if you mean it.`);
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10, onnotice: () => {} });
try {
  await sql.unsafe("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  console.log(`wiped ${host}. Run npm run db:migrate to make the tables again.`);
} finally {
  await sql.end();
}
