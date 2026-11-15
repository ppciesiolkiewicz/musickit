/**
 * Takes an account off its plan, as if it had just been made: plan_id goes back to null, so the next page it opens is
 * /account/setup, where it chooses a plan again. A teacher becomes a student meanwhile (a new account's role); an owner
 * stays an owner. Its name, sessions and saved data stay.
 *
 *   npm run db:unplan -- ann@school.com
 *
 * It refuses a database that isn't on localhost unless you pass --yes-really, so a stray DATABASE_URL in the shell
 * can't change production by accident.
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const email = process.argv.slice(2).find((a) => !a.startsWith("--"))?.trim().toLowerCase();
if (!email) {
  console.error("Which account? npm run db:unplan -- <email>");
  process.exit(1);
}

const host = new URL(url).hostname;
const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
if (!local && !process.argv.includes("--yes-really")) {
  console.error(`Refusing to change ${host}: it isn't localhost. Pass --yes-really if you mean it.`);
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10, onnotice: () => {} });
try {
  const [before] = await sql`select plan_id, role from users where email = ${email}`;
  if (!before) {
    console.error(`No account for ${email} on ${host}.`);
    process.exitCode = 1;
  } else if (before.plan_id === null) {
    console.log(`${email} has no plan already.`);
  } else {
    const [after] = await sql`
      update users set plan_id = null, role = case when role = 'owner' then role else 'student' end, updated_at = now()
      where email = ${email} returning role`;
    console.log(`${email}: off ${before.plan_id} (${before.role} → ${after.role}). The next page it opens is /account/setup.`);
  }
} finally {
  await sql.end();
}
