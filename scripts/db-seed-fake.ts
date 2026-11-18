/**
 * Fills a local database with made-up accounts to click around with: an owner, teachers with students, and students on
 * their own. Names come from @faker-js/faker, the same ones every run (`--seed`). Every email ends in
 * `@seed.musickit.test`, so `--wipe` finds and deletes exactly these accounts and nothing else.
 *
 *   npm run -s db:seed-fake                         4 teachers with 2 to 6 students each, 6 solo students, 1 owner
 *   npm run -s db:seed-fake -- --teachers 8 --solo 20 --seed 7
 *   npm run -s db:seed-fake -- --wipe               delete every seeded account (and its data, by cascade)
 *
 * Teachers' students are made with the app's own `addStudent` (account on the taught plan, link, plan document with the
 * questionnaire answers of a dev persona), then given a first week with `makeWeek` when the library has blocks
 * (`db:seed-plans`, `db:seed-blocks`). About half of them are marked as having opened their link. One solo student is
 * left before setup, to see /account/setup.
 *
 * Log in as any of them with the email: in dev, `POST /api/auth/email-link` answers with a `devLink`.
 *
 * Refuses a database that is not on this machine (`.env.local` may point at the release database); pass
 * `--allow-remote` to seed one anyway.
 */
import { faker } from "@faker-js/faker";
import { like } from "drizzle-orm";
import { toAccount } from "../src/features/account/server/auth";
import { auth as authOf } from "../src/features/account/server/http";
import type { UserRow } from "../src/features/account/server/repo";
import { TERMS_UPDATED } from "../src/features/account/terms";
import type { Role } from "../src/features/account/model";
import { PERSONAS } from "../src/features/devtools/model/personas";
import { drizzleLibraryRepo } from "../src/features/library/server/repo.drizzle";
import { areasMissingTopics, migrateAnswers } from "../src/features/plan/intake/answers";
import { localDate } from "../src/features/plan/model/schedule";
import { makeWeek } from "../src/features/students/server/plans";
import { addStudent } from "../src/features/students/server/students";
import { userData as userDataOf } from "../src/features/userData/server/http";
import { databaseUrl, getDb } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";

const DOMAIN = "seed.musickit.test";
const DAY = 24 * 60 * 60 * 1000;

function args() {
  const argv = process.argv.slice(2);
  const num = (flag: string, fallback: number) => {
    const i = argv.indexOf(flag);
    if (i < 0) return fallback;
    const n = Number(argv[i + 1]);
    if (!Number.isInteger(n) || n < 0) throw new Error(`${flag} needs a whole number.`);
    return n;
  };
  return { wipe: argv.includes("--wipe"), allowRemote: argv.includes("--allow-remote"), teachers: num("--teachers", 4), solo: num("--solo", 6), seed: num("--seed", 42) };
}

function isLocal(url: string): boolean {
  try {
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** A seeded email: first.last, then a number when that name came up already. */
function emailMaker() {
  const used = new Set<string>();
  return (first: string, last: string) => {
    const base = `${first}.${last}`.toLowerCase().normalize("NFD").replace(/[^a-z.]/g, "");
    let email = `${base}@${DOMAIN}`;
    for (let n = 2; used.has(email); n++) email = `${base}${n}@${DOMAIN}`;
    used.add(email);
    return email;
  };
}

async function main() {
  const opts = args();
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is not set.");
  if (!isLocal(url) && !opts.allowRemote) throw new Error(`DATABASE_URL is not on this machine (${new URL(url).hostname}). Point it at the local database, or pass --allow-remote.`);
  const db = getDb()!;

  const gone = await db.delete(users).where(like(users.email, `%@${DOMAIN}`)).returning({ id: users.id });
  if (gone.length) console.log(`deleted ${gone.length} seeded account${gone.length === 1 ? "" : "s"}`);
  if (opts.wipe) return;

  const auth = authOf()!;
  const store = userDataOf()!;
  const repo = auth.repo;
  const library = drizzleLibraryRepo(db);
  faker.seed(opts.seed);
  const email = emailMaker();
  const now = new Date();
  const today = localDate(now);

  const plans = await repo.listPlans();
  const teacherPlans = plans.filter((p) => p.role === "teacher" && p.enabled).sort((a, b) => a.sort - b.sort);
  const studentPlan = plans.find((p) => p.id === "student") ?? plans.find((p) => p.role === "student" && p.enabled);
  if (!teacherPlans.length || !studentPlan) throw new Error("No teacher or student plans in the plans table: run db:migrate.");

  // the personas whose answers a teacher could send (some leave an area's topics empty, which addStudent refuses)
  const personas = PERSONAS.filter((p) => !areasMissingTopics(migrateAnswers(p.answers)).length);

  const rows: { email: string; role: string; plan: string; note: string }[] = [];

  /** An account that has been through setup: a plan, the terms, maybe the email updates. */
  async function person(role: Role, planId: string | null, opts2: { since: Date } = { since: faker.date.recent({ days: 90 }) }): Promise<UserRow> {
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const made = await repo.createUser({ email: email(first, last), name: `${first} ${last}`, role }, opts2.since);
    if (!made) throw new Error("A seeded email already has an account.");
    if (!planId) return made;
    await repo.setUserPlan(made.id, planId, faker.helpers.arrayElement(["month", "year"] as const), role, opts2.since);
    await repo.acceptTerms(made.id, TERMS_UPDATED, opts2.since);
    if (faker.datatype.boolean()) await repo.setEmailUpdates(made.id, true, opts2.since);
    return (await repo.userById(made.id))!;
  }

  // the owner runs a school: the plan with the most students
  const biggest = [...teacherPlans].sort((a, b) => (b.students ?? Infinity) - (a.students ?? Infinity))[0];
  const owner = await person("owner", biggest.id);
  rows.push({ email: owner.email, role: "owner", plan: biggest.id, note: "" });

  for (let t = 0; t < opts.teachers; t++) {
    const plan = teacherPlans[t % teacherPlans.length];
    const teacher = await person("teacher", plan.id, { since: faker.date.recent({ days: 120 }) });
    const account = toAccount(teacher);
    const want = Math.min(faker.number.int({ min: 2, max: 6 }), plan.students ?? Infinity);
    let made = 0;
    let weeks = 0;
    let weekNote = "";
    for (let s = 0; s < want; s++) {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const persona = faker.helpers.arrayElement(personas);
      const added = await addStudent({ auth, userData: store.repo }, account, { name: `${first} ${last}`, email: email(first, last), answers: persona.answers, today });
      if (!added.ok) {
        console.warn(`  ${teacher.email}: student not added (${added.error})`);
        continue;
      }
      made++;
      const student = (await repo.userById(added.studentId))!;
      const week = await makeWeek({ auth, userData: store.repo, library }, account, added.studentId, { today, rotate: false }, now, () => crypto.randomUUID());
      if (week.ok) weeks++;
      else weekNote = `no weeks: ${week.error}`;
      const claimed = faker.datatype.boolean();
      if (claimed) await repo.markClaimed(added.studentId, new Date(now.getTime() - faker.number.int({ min: 0, max: 20 }) * DAY));
      rows.push({ email: student.email, role: "student", plan: "taught", note: `${persona.id}, of ${teacher.name}${claimed ? ", link opened" : ""}` });
    }
    rows.splice(rows.length - made, 0, { email: teacher.email, role: "teacher", plan: plan.id, note: `${made} students, ${weeks} with a week${weekNote && !weeks ? ` (${weekNote}: seed the library)` : ""}` });
  }

  for (let s = 0; s < opts.solo; s++) {
    const beforeSetup = s === 0;
    const student = await person("student", beforeSetup ? null : studentPlan.id);
    rows.push({ email: student.email, role: "student", plan: beforeSetup ? "(none)" : studentPlan.id, note: beforeSetup ? "before setup" : "" });
  }

  const w = Math.max(...rows.map((r) => r.email.length));
  for (const r of rows) console.log(`${r.email.padEnd(w)}  ${r.role.padEnd(7)}  ${r.plan.padEnd(13)}  ${r.note}`);
  console.log(`\n${rows.length} accounts. Log in with the email; in dev the login answers with a link.`);
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
