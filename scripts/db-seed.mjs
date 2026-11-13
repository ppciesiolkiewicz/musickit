/**
 * Adds accounts to the database at DATABASE_URL. An email that already has an account is left as it is.
 *
 *   npm run db:seed -- you+student@example.com:student you+teacher@example.com:owner
 *
 * Each argument is email:role (student, teacher or owner) with an optional :Name after it. The person logs in with an
 * emailed link or Google as usual; seeding only makes the account exist with that role.
 */
import postgres from "postgres";

const ROLES = ["student", "teacher", "owner"];

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const people = process.argv.slice(2).map((arg) => {
  const [rawEmail, role, ...name] = arg.split(":");
  const email = rawEmail?.trim().toLowerCase();
  if (!email?.includes("@") || !ROLES.includes(role)) {
    console.error(`Not email:role[:Name]: ${arg}`);
    process.exit(1);
  }
  return { email, role, name: name.join(":").trim() || email.split("@")[0] };
});
if (!people.length) {
  console.error("Give at least one email:role.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
try {
  for (const p of people) {
    const added = await sql`
      insert into users (email, name, role) values (${p.email}, ${p.name}, ${p.role})
      on conflict (email) do nothing returning id`;
    console.log(`${added.length ? "added  " : "exists "} ${p.email} (${p.role})`);
  }
} finally {
  await sql.end();
}
