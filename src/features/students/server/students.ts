import { can, cleanEmail, cleanName, isEmail, type Account } from "@/features/account/model";
import { TAUGHT_PLAN_ID } from "@/features/account/plans";
import { hashToken, startSession, type AuthDeps, type SignedIn } from "@/features/account/server/auth";
import { migrateAnswers, areasMissingTopics } from "@/features/plan/intake/answers";
import { recordAnswers } from "@/features/plan/model/answersHistory";
import { EMPTY_STATE } from "@/features/plan/model/types";
import { writeDoc, writeVoice } from "@/features/userData/server/data";
import type { UserDataRepo } from "@/features/userData/server/repo";
import { activeOn, canGive, type Places } from "../model/places";
import type { StudentList, StudentRow } from "../model/types";

/**
 * A teacher's students, as rules over the repos: adding one (which makes a normal account for them), the claim link the
 * student opens to sign in the first time, and the teacher's list. No HTTP and no database here; the routes call these.
 * A raw claim token goes to the caller to mail; the repo only ever sees its SHA-256. It is never logged.
 */

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** How long a claim link works. */
export const CLAIM_TTL = 30 * DAY;
/** A new claim link for the same student waits this long after the last one. */
const CLAIM_WAIT = MINUTE;
/** At most this many claim links for one student in a day (the one made when the student was added counts). */
export const CLAIM_DAY_LIMIT = 5;
/** Where a student lands after the first sign in. */
const CLAIM_NEXT = "/welcome";

export interface StudentsDeps {
  auth: AuthDeps;
  userData: UserDataRepo;
}

export type { StudentRow } from "../model/types";

/** A student as the teacher's list shows them, from the account row and the link's dates. */
export const studentRow = (user: { id: string; name: string; email: string }, createdAt: Date, claimedAt: Date | null): StudentRow => ({
  id: user.id, name: user.name, email: user.email, addedAt: createdAt.toISOString(), claimedAt: claimedAt?.toISOString() ?? null,
});

/**
 * Why a student wasn't added. `exists`: the address has an account that no teacher has (a player, or the teacher). A
 * student has one teacher for now, so `taught` (another teacher's student) and `listed` (already this teacher's) refuse too.
 */
export type AddStudentError = "name" | "email" | "exists" | "taught" | "listed" | "limit" | "answers" | "not-teacher";

/** The teacher's plan's limit (null: no limit; no plan row, or none with students: 0) and its extra students a month. */
async function planPlaces(deps: AuthDeps, teacher: Account): Promise<{ limit: number | null; extra: number }> {
  const user = await deps.repo.userById(teacher.id);
  const plan = user?.planId ? (await deps.repo.listPlans()).find((p) => p.id === user.planId) : undefined;
  return plan ? { limit: plan.students, extra: plan.students === null ? 0 : plan.extraStudents } : { limit: 0, extra: 0 };
}

/**
 * The teacher's places in `today`'s month (the teacher's day): the plan's limit and extras, how many students are
 * active (given a week this month), and which ones, so a student already active can always get another week.
 */
export async function placesOf(deps: AuthDeps, teacher: Account, today: string): Promise<Places & { activeIds: Set<string> }> {
  const rows = await deps.repo.studentsOf(teacher.id);
  const activeIds = new Set(rows.filter((r) => activeOn(r.plannedOn, today)).map((r) => r.user.id));
  return { ...(await planPlaces(deps, teacher)), active: activeIds.size, activeIds };
}

async function makeClaim(deps: AuthDeps, email: string): Promise<string> {
  const now = deps.now();
  const claimToken = deps.token();
  await deps.repo.createToken(
    { kind: "claim", tokenHash: hashToken(claimToken), codeHash: null, email, name: null, role: null, provider: null, providerAccountId: null, next: CLAIM_NEXT, expiresAt: new Date(now.getTime() + CLAIM_TTL) },
    now,
  );
  return claimToken;
}

/**
 * Makes the student's account (role student, on the taught plan, so it needs no setup), links it to the teacher, writes
 * its plan document with the answers (one `answersHistory` entry), and makes the claim token. When a step after the
 * account fails, the account is deleted again and the error is thrown, so no half-made student stays.
 */
export async function addStudent(
  deps: StudentsDeps,
  teacher: Account,
  input: { name: unknown; email: unknown; answers: unknown; today: string },
): Promise<{ ok: true; studentId: string; claimToken: string } | { ok: false; error: Exclude<AddStudentError, "limit"> } | { ok: false; error: "limit"; limit: number; extra: number }> {
  const { auth } = deps;
  if (!can(teacher, "students")) return { ok: false, error: "not-teacher" };
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "name" };
  const email = typeof input.email === "string" ? cleanEmail(input.email) : "";
  if (!isEmail(email)) return { ok: false, error: "email" };
  const answers = migrateAnswers(input.answers);
  if (!answers.areas.length || areasMissingTopics(answers).length) return { ok: false, error: "answers" };

  // a new student is active once their first week is made, so adding one needs a place this month
  const places = await placesOf(auth, teacher, input.today);
  if (!canGive(places, false)) return { ok: false, error: "limit", limit: places.limit ?? 0, extra: places.extra };
  const existing = await auth.repo.userByEmail(email);
  if (existing) {
    const theirs = await auth.repo.teacherOf(existing.id);
    return { ok: false, error: !theirs ? "exists" : theirs.id === teacher.id ? "listed" : "taught" };
  }

  const now = auth.now();
  const made = await auth.repo.createUser({ email, name, role: "student" }, now);
  if (!made) return { ok: false, error: "exists" };
  try {
    await auth.repo.setUserPlan(made.id, TAUGHT_PLAN_ID, "year", "student", now);
    await auth.repo.addStudent(teacher.id, made.id, now);
    const state = recordAnswers({ ...EMPTY_STATE, answers }, answers, now.toISOString());
    const wrote = await writeDoc(deps.userData, made.id, "plan", state, now);
    if (!wrote.ok) throw new Error(`the student's plan document was not written: ${wrote.error}`);
    // the voice the teacher picked is the student's voice until they find their own range
    if (answers.voice) await writeVoice(deps.userData, made.id, answers.voice, now);
    return { ok: true, studentId: made.id, claimToken: await makeClaim(auth, email) };
  } catch (error) {
    // the delete failing must not hide why the add failed: it is logged, and the first error is the one thrown
    try {
      await auth.repo.deleteUser(made.id);
    } catch (deleteError) {
      console.error(`[students] the half-made student ${made.id} could not be deleted`, deleteError);
    }
    throw error;
  }
}

/** The teacher's students, newest first, with the plan's limit (null: any number), its extras and the active count on `today`. */
export async function listStudents(deps: StudentsDeps, teacher: Account, today: string): Promise<StudentList> {
  const rows = await deps.auth.repo.studentsOf(teacher.id);
  const { limit, extra, active } = await placesOf(deps.auth, teacher, today);
  return { students: rows.map((r) => studentRow(r.user, r.createdAt, r.claimedAt)), limit, extra, active };
}

export type NewClaimError = "not-found" | "claimed" | "wait" | "daily";

/**
 * A new claim link for the teacher's own student who has not signed in yet; at most one a minute for each student, and
 * `CLAIM_DAY_LIMIT` in a day (`daily`), so a teacher can't have attunr mail an address over and over.
 */
export async function newClaimLink(
  deps: StudentsDeps,
  teacher: Account,
  studentId: string,
): Promise<{ ok: true; email: string; name: string; claimToken: string } | { ok: false; error: Exclude<NewClaimError, "wait"> } | { ok: false; error: "wait"; waitMs: number }> {
  const { repo, now } = deps.auth;
  const link = await repo.studentLink(teacher.id, studentId);
  const student = link && (await repo.userById(studentId));
  if (!link || !student) return { ok: false, error: "not-found" };
  if (link.claimedAt) return { ok: false, error: "claimed" };
  const last = await repo.lastTokenAt(student.email, "claim");
  const left = last ? last.getTime() + CLAIM_WAIT - now().getTime() : 0;
  if (left > 0) return { ok: false, error: "wait", waitMs: left };
  if ((await repo.countTokens(student.email, "claim", new Date(now().getTime() - DAY))) >= CLAIM_DAY_LIMIT) return { ok: false, error: "daily" };
  return { ok: true, email: student.email, name: student.name, claimToken: await makeClaim(deps.auth, student.email) };
}

/** Whose link it is, without using it, for the page that shows one button. Null for a used, expired or unknown token. */
export async function peekClaim(deps: AuthDeps, token: unknown): Promise<{ name: string } | null> {
  const { repo, now } = deps;
  if (typeof token !== "string" || !token) return null;
  const row = await repo.peekToken(hashToken(token), "claim", now());
  const user = row && (await repo.userByEmail(row.email));
  return user ? { name: user.name } : null;
}

/** The claim link was used: signs the student in, and records the first time. Null for a used, expired or unknown token. */
export async function openClaim(deps: AuthDeps, token: unknown, userAgent: string | null): Promise<SignedIn | null> {
  if (typeof token !== "string" || !token) return null;
  const row = await deps.repo.takeToken(hashToken(token), "claim", deps.now());
  const user = row && (await deps.repo.userByEmail(row.email));
  if (!user) return null;
  await deps.repo.markClaimed(user.id, deps.now());
  return startSession(deps, user, CLAIM_NEXT, userAgent, false);
}
