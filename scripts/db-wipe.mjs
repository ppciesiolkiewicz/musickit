/**
 * Deletes every row in every table of the database at DATABASE_URL. The tables and the migration record stay, so the
 * app works straight away with an empty database: no accounts, no saved data.
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
  const tables = await sql`select tablename from pg_tables where schemaname = 'public' order by tablename`;
  if (!tables.length) {
    console.log(`no tables on ${host}. Run npm run db:migrate first.`);
  } else {
    const list = tables.map((t) => `public."${t.tablename.replaceAll('"', '""')}"`).join(", ");
    await sql.unsafe(`truncate ${list} restart identity cascade`);
    for (const t of tables) console.log(`emptied ${t.tablename}`);
  }
} finally {
  await sql.end();
}
