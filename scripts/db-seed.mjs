/**
 * Adds accounts to the database at DATABASE_URL. An email that already has an account is left as it is, except that
 * seeding it as admin gives it every permission.
 *
 *   npm run db:seed -- you+student@example.com:student you+teacher@example.com:owner
 *   npm run db:seed-admin
 *
 * Each argument is email:role (student, teacher or owner) with an optional :Name after it. `admin` in place of the role
 * makes a student with all three permissions (dev, content, admin), or gives an existing account those permissions and
 * keeps its role. The person logs in with an emailed link or Google as usual; seeding only makes the account exist.
 */
import postgres from "postgres";

const ROLES = ["student", "teacher", "owner", "admin"];
const ALL_PERMISSIONS = ["dev", "content", "admin"];

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
    const admin = p.role === "admin";
    const added = await sql`
      insert into users (email, name, role, permissions)
      values (${p.email}, ${p.name}, ${admin ? "student" : p.role}, ${admin ? ALL_PERMISSIONS : []})
      on conflict (email) do nothing returning id`;
    if (added.length) {
      console.log(`added    ${p.email} (${admin ? "student, every permission" : p.role})`);
    } else if (admin) {
      await sql`update users set permissions = ${ALL_PERMISSIONS}, updated_at = now() where email = ${p.email}`;
      console.log(`admin    ${p.email} (was there; now has every permission)`);
    } else {
      console.log(`exists   ${p.email} (${p.role})`);
    }
  }
} finally {
  await sql.end();
}
