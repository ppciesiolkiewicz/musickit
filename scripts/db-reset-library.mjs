/**
 * Empties the app's part of the block library at DATABASE_URL, so the seed can write it again from the files in
 * src/features/library/seed: the app's ownership of blocks, and every block no player owns, with its choices (choices).
 * A block a player owns stays, with that player's row and its choices.
 *
 *   npm run db:reset-library
 *   npm run -s db:seed-blocks     (then seed again)
 *
 * It refuses a database that isn't on localhost unless you pass --yes-really, as db:wipe does.
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
  console.error(`Refusing to reset the library on ${host}: it isn't localhost. Pass --yes-really if you mean it.`);
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10, onnotice: () => {} });
const counts = async (q) => {
  const [r] = await q`select
    (select count(*)::int from blocks) as blocks,
    (select count(*)::int from choices) as choices,
    (select count(*)::int from block_owners where user_id is null) as app_owned,
    (select count(*)::int from block_owners where user_id is not null) as player_owned`;
  return JSON.stringify(r);
};
try {
  console.log(`Database: ${host}`);
  console.log("before", await counts(sql));
  await sql.begin(async (tx) => {
    await tx`delete from block_owners where user_id is null`;
    await tx`delete from choices c where not exists (select 1 from block_owners o where o.block_id = c.block_id)`;
    await tx`delete from blocks b where not exists (select 1 from block_owners o where o.block_id = b.id)`;
  });
  console.log("after ", await counts(sql));
  console.log("Now seed: npm run -s db:seed-blocks");
} finally {
  await sql.end();
}
