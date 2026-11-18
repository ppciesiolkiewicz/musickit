/**
 * Empties what players have stored about practice plans at DATABASE_URL, and nothing else: every player's plan document
 * (answers, today's plan, past days, plans shared with them), their ratings (progress_entries), the day timer's rows
 * (plan_day_times), shared plans and who claimed them, and the blocks only players own. Accounts,
 * sessions, subscriptions, notes, videos, shared notes and the app's block library stay.
 *
 *   npm run db:wipe-plans
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
  console.error(`Refusing to wipe plan data on ${host}: it isn't localhost. Pass --yes-really if you mean it.`);
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10, onnotice: () => {} });
const counts = async (q) => {
  const [r] = await q`select
    (select count(*)::int from user_documents where kind = 'plan') as plan_documents,
    (select count(*)::int from progress_entries) as ratings,
    (select count(*)::int from plan_day_times) as day_times,
    (select count(*)::int from shares where kind = 'plan') as shared_plans,
    (select count(*)::int from plan_claims) as plan_claims,
    (select count(*)::int from block_owners where user_id is not null) as player_owned_blocks,
    (select count(*)::int from blocks) as blocks,
    (select count(*)::int from users) as accounts`;
  return JSON.stringify(r);
};
try {
  console.log(`Database: ${host}`);
  console.log("before", await counts(sql));
  await sql.begin(async (tx) => {
    await tx`delete from user_documents where kind = 'plan'`;
    await tx`delete from progress_entries`;
    await tx`delete from plan_day_times`;
    await tx`delete from plan_claims`;
    await tx`delete from shares where kind = 'plan'`;
    await tx`delete from block_owners where user_id is not null`;
    await tx`delete from blocks b where not exists (select 1 from block_owners o where o.block_id = b.id)`;
  });
  console.log("after ", await counts(sql));
} finally {
  await sql.end();
}
