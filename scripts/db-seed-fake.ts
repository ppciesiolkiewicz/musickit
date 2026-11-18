/**
 * Fills a local database with made-up accounts to click around with: an owner, teachers with students, and students on
 * their own. Names come from @faker-js/faker, the same ones every run (`--seed`). Every email ends in
 * `@seed.musickit.test`, so `--wipe` finds and deletes exactly these accounts and nothing else.
 *
 *   npm run -s db:seed-fake                         4 teachers with 2 to 6 students each, 6 solo students, 1 owner
 *   npm run -s db:seed-fake -- --teachers 8 --solo 20 --seed 7
 *   npm run -s db:seed-fake -- --no-progress        the same accounts, every student with only this week and no ratings
 *   npm run -s db:seed-fake -- --wipe               delete every seeded account (and its data, by cascade)
 *
 * Teachers' students are made with the app's own `addStudent` (account on the taught plan, link, plan document with the
 * questionnaire answers of a dev persona), then given a first week with `makeWeek` when the library has blocks
 * (`db:seed-plans`, `db:seed-blocks`). Most of them have opened their link: those started 1 to 4 weeks ago, have a week
 * for each, and have rated their past days (`fakeProgress`: a level of their own, one or two weak topics, noise). The
 * rest were added this week and have done nothing. One solo student is left before setup, to see /account/setup.
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
import { entryFor } from "../src/features/plan/model/progressLog";
import { addDays, localDate } from "../src/features/plan/model/schedule";
import type { PlanAnswers, PlanState } from "../src/features/plan/model/types";
import type { Stars } from "../src/features/progress/stars";
import { makeWeek } from "../src/features/students/server/plans";
import { addStudent } from "../src/features/students/server/students";
import { readDocVersioned, writeDoc } from "../src/features/userData/server/data";
import { userData as userDataOf } from "../src/features/userData/server/http";
import type { UserDataRepo } from "../src/features/userData/server/repo";
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
  return { wipe: argv.includes("--wipe"), progress: !argv.includes("--no-progress"), allowRemote: argv.includes("--allow-remote"), teachers: num("--teachers", 4), solo: num("--solo", 6), seed: num("--seed", 42) };
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

/**
 * A persona's answers made one student's own: one or two topics a level or two lower (the weak ones, at least one level
 * under the rest where it can be), every other topic moved a level up or down now and then.
 */
function weakAnswers(raw: PlanAnswers): { answers: PlanAnswers; weak: Set<string> } {
  const answers = migrateAnswers(raw);
  const ids = Object.keys(answers.topics);
  const weak = new Set(faker.helpers.arrayElements(ids, { min: 1, max: Math.min(2, ids.length) }));
  const clamp = (n: number) => Math.min(3, Math.max(0, n)) as PlanAnswers["topics"][string];
  const topics = Object.fromEntries(
    ids.map((id) => [id, weak.has(id) ? clamp(answers.topics[id] - faker.number.int({ min: 1, max: 2 })) : clamp(answers.topics[id] + faker.helpers.arrayElement([-1, 0, 0, 0, 1]))]),
  );
  return { answers: { ...answers, topics }, weak };
}

/** A normal draw (Box-Muller) from faker, so the same seed gives the same ratings. */
const gauss = (sd: number) => Math.sqrt(-2 * Math.log(1 - faker.number.float({ min: 0, max: 0.999999 }))) * Math.cos(2 * Math.PI * faker.number.float()) * sd;

/**
 * Ratings and practice time on the student's past days, as if they had used the app: each student has a level of their
 * own (3.3 to 4.4 stars), their weak topics (`weakAnswers`) well under it, a little better each week, and noise on every
 * rating. A rating can only lift a topic (4 stars or more makes a concept solid), so the weak topics stay low and the
 * strong ones creep between levels.
 * Some days are skipped, and some exercises of a day are left unrated. Written to the plan document (`done`, `rated`),
 * the progress log and the day timer, the three places a real rating and a real timer reach. Days after today are left.
 * Answers a line for the listing: the weak topics and how many ratings.
 */
async function fakeProgress(repo: UserDataRepo, userId: string, today: string, weak: Set<string>): Promise<string> {
  const { data, version } = await readDocVersioned(repo, userId, "plan");
  const state = data as PlanState;
  const weeks = [...state.given].sort((a, b) => a.startedOn.localeCompare(b.startedOn));
  const level = faker.number.float({ min: 3.3, max: 4.4 });
  const weakLevel = faker.number.float({ min: 1.2, max: 2.2 });
  const keen = faker.number.float({ min: 0.45, max: 0.95 });
  let ratings = 0;

  for (const [w, plan] of weeks.entries()) {
    plan.done = { ...plan.done };
    plan.rated = { ...plan.rated };
    for (const [d, day] of plan.config.days.entries()) {
      const date = addDays(plan.startedOn, d);
      if (date >= today || !faker.datatype.boolean({ probability: keen })) continue;
      const spent: Record<string, number> = {};
      const blocks: Record<string, string> = {};
      for (const [x, e] of day.exercises.entries()) {
        if (!e.id || !faker.datatype.boolean({ probability: 0.85 })) continue;
        const isWeak = !!e.topic && weak.has(e.topic);
        const mean = (isWeak ? weakLevel + 0.1 * w : level + 0.2 * w) + gauss(0.7);
        const stars = Math.min(5, Math.max(1, Math.round(mean))) as Stars;
        const [y, m, dd] = date.split("-").map(Number);
        const at = new Date(y, m - 1, dd, faker.number.int({ min: 16, max: 21 }), faker.number.int({ min: 0, max: 59 })).toISOString();
        plan.done[`${d}:${x}`] = true;
        plan.rated[`${d}:${x}`] = { stars, at };
        const entry = entryFor(plan, d, x, { stars, at }, () => crypto.randomUUID());
        if (entry) await repo.putProgress(userId, entry, new Date(at));
        spent[e.id] = Math.round(e.minutes * 60 * faker.number.float({ min: 0.6, max: 1.3 }));
        if (e.blockId) blocks[e.id] = e.blockId;
        ratings++;
      }
      const elapsed = Object.values(spent).reduce((a, b) => a + b, 0);
      if (elapsed) await repo.putPlanTime(userId, { planId: plan.id, day: d, elapsed, spent, blocks, on: { [date]: elapsed } }, new Date(`${date}T20:00:00`));
    }
  }

  const wrote = await writeDoc(repo, userId, "plan", { ...state, given: [...weeks].reverse() }, new Date(), version);
  if (!wrote.ok) throw new Error(`the student's ratings were not written: ${wrote.error}`);
  return `${ratings} ratings`;
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
      const { answers, weak } = weakAnswers(persona.answers);
      // a student who opened their link has been at it for 1 to 4 weeks before this one; one who hasn't was added this week
      const claimed = faker.datatype.boolean({ probability: 0.6 });
      const weeksBack = opts.progress && claimed ? faker.number.int({ min: 1, max: 4 }) : 0;
      const addedOn = new Date(now.getTime() - (weeksBack * 7 + faker.number.int({ min: 0, max: 2 })) * DAY);
      const added = await addStudent({ auth: { ...auth, now: () => addedOn }, userData: store.repo }, account, { name: `${first} ${last}`, email: email(first, last), answers, today: localDate(addedOn) });
      if (!added.ok) {
        console.warn(`  ${teacher.email}: student not added (${added.error})`);
        continue;
      }
      made++;
      const student = (await repo.userById(added.studentId))!;
      // one week a week, oldest first, ending with the one running today
      let given = 0;
      for (let k = weeksBack; k >= 0; k--) {
        const on = new Date(now.getTime() - k * 7 * DAY);
        const week = await makeWeek({ auth, userData: store.repo, library }, account, added.studentId, { today: localDate(on), rotate: false }, on, () => crypto.randomUUID());
        if (week.ok) given++;
        else weekNote = `no weeks: ${week.error}`;
      }
      if (given) weeks++;
      if (claimed) await repo.markClaimed(added.studentId, new Date(addedOn.getTime() + faker.number.int({ min: 0, max: 1 }) * DAY));
      const progress = claimed && given && opts.progress ? await fakeProgress(store.repo, added.studentId, today, weak) : null;
      rows.push({ email: student.email, role: "student", plan: "taught", note: `${persona.id}, of ${teacher.name}${claimed ? ", link opened" : ""}, weak in ${[...weak].join(" and ")}${progress ? `, ${progress}` : ""}` });
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
