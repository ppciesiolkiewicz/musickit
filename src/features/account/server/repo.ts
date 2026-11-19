import type { Role } from "../model";
import type { Billing, Plan } from "../plans";

/** A user row, as the database holds it. */
export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Null until the account chooses a plan on /account/setup. */
  planId: string | null;
  /** How they pay for the plan: monthly or yearly. */
  billing: Billing;
  /** When they agreed to emails about what we fix and add, and offers; null when they haven't. */
  emailUpdatesAt: Date | null;
  /** When they agreed to the terms of use, and which (`TERMS_UPDATED`); null until they have. */
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
  createdAt: Date;
}

/** A plan priced with the person, asked for (`plan_requests`). */
export interface PlanRequest {
  planId: string;
  createdAt: Date;
}

export type TokenKind = "email_link" | "signup" | "claim";

/** A short-lived single-use proof (see `authTokens` in lib/db/schema.ts). */
export interface TokenRow {
  kind: TokenKind;
  tokenHash: string;
  /** The 6-digit code mailed with an email link, hashed with the email (`hashCode`). */
  codeHash: string | null;
  email: string;
  name: string | null;
  role: Role | null;
  provider: string | null;
  providerAccountId: string | null;
  next: string | null;
  expiresAt: Date;
}

/** A teacher invite (`teacher_invites`): a link we send a teacher to try the app on a plan no one can choose. */
export interface InviteRow {
  id: string;
  planId: string;
  /** Who it was for, as we typed it on /admin/invites. */
  note: string;
  /** The token in the link, so /admin/invites can copy it again; null for invites made before it was kept. */
  token: string | null;
  createdAt: Date;
  /** The account that joined with it, and when; null while no one has. */
  claimedBy: { id: string; email: string; name: string } | null;
  claimedAt: Date | null;
}

export interface SessionRow {
  user: UserRow;
  expiresAt: Date;
}

/**
 * Everything sign-in needs from storage. `drizzleRepo` is the real one (Postgres), `memoryRepo` the one the tests use.
 * Each call takes `now`, so the logic in auth.ts stays pure.
 */
export interface AuthRepo {
  userByEmail(email: string): Promise<UserRow | null>;
  /** Null when the email already has a user. */
  createUser(input: { email: string; name: string; role: Role }, now: Date): Promise<UserRow | null>;
  userById(id: string): Promise<UserRow | null>;
  /** Every user, newest first: for /admin/users. */
  listUsers(): Promise<UserRow[]>;
  updateUserName(id: string, name: string, now: Date): Promise<UserRow | null>;
  /** Turns the emails about what we fix and add, and offers on (from `now`) or off. Turning them on again keeps the first time. */
  setEmailUpdates(id: string, on: boolean, now: Date): Promise<UserRow | null>;
  /** Records that they agreed to the terms of use `version`, at `now`. */
  acceptTerms(id: string, version: string, now: Date): Promise<UserRow | null>;
  /** Every plan, turned off or not. */
  listPlans(): Promise<Plan[]>;
  /** Moves the user to the plan, paid by `billing`, with the role it gives, in one step. */
  setUserPlan(userId: string, planId: string, billing: Billing, role: Role, now: Date): Promise<UserRow | null>;
  /**
   * Records that the user chose a plan priced with them (`pricedWithYou`), so we write to them. The first request stays:
   * choosing it again keeps its date.
   */
  requestPlan(userId: string, planId: string, now: Date): Promise<void>;
  /** The user's plan request, or null when they never chose a plan priced with them. */
  planRequest(userId: string): Promise<PlanRequest | null>;
  /** Links a student to their teacher. Throws when the student already has a teacher. */
  addStudent(teacherId: string, studentId: string, now: Date): Promise<void>;
  /** The teacher's students, newest link first. */
  studentsOf(teacherId: string): Promise<{ user: UserRow; createdAt: Date; claimedAt: Date | null; plannedOn: string | null }[]>;
  /** The link of this teacher and student, or null when the student is not theirs. */
  studentLink(teacherId: string, studentId: string): Promise<{ createdAt: Date; claimedAt: Date | null } | null>;
  /** Records the student's first sign in. Only while it is null: a later call keeps the first time. */
  markClaimed(studentId: string, now: Date): Promise<void>;
  /** The teacher gave the student a week on `day` (the teacher's yyyy-mm-dd): the student is active that month. */
  markPlanned(teacherId: string, studentId: string, day: string): Promise<void>;
  /** The student's teacher, or null. */
  teacherOf(studentId: string): Promise<UserRow | null>;
  /** Stores a new teacher invite: its token, and the token's hash to find it by. */
  createInvite(input: { token: string; tokenHash: string; planId: string; note: string }, now: Date): Promise<InviteRow>;
  /** Every teacher invite, newest first. */
  listInvites(): Promise<InviteRow[]>;
  /** The invite with this token hash, used or not. */
  inviteByHash(tokenHash: string): Promise<InviteRow | null>;
  /** Marks the invite used by the user, in one step: null when it is gone or someone else used it first. Using it again by the same user gives it back. */
  claimInvite(tokenHash: string, userId: string, now: Date): Promise<InviteRow | null>;
  deleteInvite(id: string): Promise<void>;
  /** Deletes the user with their sessions and identities. */
  deleteUser(id: string): Promise<void>;

  userByIdentity(provider: string, providerAccountId: string): Promise<UserRow | null>;
  /** Does nothing when the identity is already linked. */
  linkIdentity(userId: string, provider: string, providerAccountId: string, now: Date): Promise<void>;

  createToken(token: TokenRow, now: Date): Promise<void>;
  /** How many tokens of this kind were made for the email since `since`. */
  countTokens(email: string, kind: TokenKind, since: Date): Promise<number>;
  /** When the newest token of this kind was made for the email, or null when there is none. */
  lastTokenAt(email: string, kind: TokenKind): Promise<Date | null>;
  /** The token when it is unused and not expired; it stays usable. */
  peekToken(tokenHash: string, kind: TokenKind, now: Date): Promise<TokenRow | null>;
  /** The same, and marks it used in one step, so two requests can't both take it. */
  takeToken(tokenHash: string, kind: TokenKind, now: Date): Promise<TokenRow | null>;
  /**
   * A try at the email's codes: the live email links with a code and fewer than `maxTries` tries each get one more try,
   * in one step, and come back. The caller compares the code.
   */
  tryCodes(email: string, maxTries: number, now: Date): Promise<TokenRow[]>;

  createSession(session: { tokenHash: string; userId: string; userAgent: string | null; expiresAt: Date }, now: Date): Promise<void>;
  /** The session's user when the session has not expired. */
  sessionUser(tokenHash: string, now: Date): Promise<SessionRow | null>;
  /** Moves the expiry on and records the visit. */
  touchSession(tokenHash: string, expiresAt: Date, now: Date): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;

  /** Housekeeping: drops expired sessions and tokens. */
  deleteExpired(now: Date): Promise<void>;
}
