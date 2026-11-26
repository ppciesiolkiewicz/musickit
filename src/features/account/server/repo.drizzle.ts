import { and, count, desc, eq, getTableColumns, gt, gte, isNotNull, isNull, lt, lte, max, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { authTokens, identities, payments, planRequests, plans, sessions, teacherInvites, teacherStudents, users } from "@/lib/db/schema";
import type { Plan } from "../plans";
import type { AuthRepo, InviteRow, TokenRow, UserFootprint } from "./repo";

const userCols = { id: users.id, email: users.email, name: users.name, role: users.role, permissions: users.permissions, planId: users.planId, billing: users.billing, paymentExempt: users.paymentExempt, planEndsAt: users.planEndsAt, stripeCustomerId: users.stripeCustomerId, stripeSubscriptionId: users.stripeSubscriptionId, subscriptionStatus: users.subscriptionStatus, emailUpdatesAt: users.emailUpdatesAt, termsAcceptedAt: users.termsAcceptedAt, termsVersion: users.termsVersion, createdAt: users.createdAt };

const tokenCols = {
  kind: authTokens.kind,
  tokenHash: authTokens.tokenHash,
  codeHash: authTokens.codeHash,
  email: authTokens.email,
  name: authTokens.name,
  role: authTokens.role,
  provider: authTokens.provider,
  providerAccountId: authTokens.providerAccountId,
  next: authTokens.next,
  expiresAt: authTokens.expiresAt,
};

/** The invite columns, with who joined with it. */
const inviteCols = {
  id: teacherInvites.id,
  planId: teacherInvites.planId,
  note: teacherInvites.note,
  token: teacherInvites.token,
  createdAt: teacherInvites.createdAt,
  claimedAt: teacherInvites.claimedAt,
  userId: users.id,
  userEmail: users.email,
  userName: users.name,
};
type InviteSelect = { id: string; planId: string; note: string; token: string | null; createdAt: Date; claimedAt: Date | null; userId: string | null; userEmail: string | null; userName: string | null };
const toInvite = (r: InviteSelect): InviteRow => ({
  id: r.id,
  planId: r.planId,
  note: r.note,
  token: r.token,
  createdAt: r.createdAt,
  claimedAt: r.claimedAt,
  claimedBy: r.userId && r.userEmail !== null && r.userName !== null ? { id: r.userId, email: r.userEmail, name: r.userName } : null,
});

/** The repo over Postgres. */
export function drizzleRepo(db: Db): AuthRepo {
  const invitesWhere = (where: ReturnType<typeof eq>) =>
    db.select(inviteCols).from(teacherInvites).leftJoin(users, eq(users.id, teacherInvites.claimedBy)).where(where);

  const liveToken = (hash: string, kind: TokenRow["kind"], now: Date) =>
    and(eq(authTokens.tokenHash, hash), eq(authTokens.kind, kind), isNull(authTokens.usedAt), gt(authTokens.expiresAt, now));

  return {
    async userByEmail(email) {
      const [row] = await db.select(userCols).from(users).where(eq(users.email, email)).limit(1);
      return row ?? null;
    },
    async createUser(input, now) {
      const [row] = await db.insert(users).values({ ...input, createdAt: now, updatedAt: now }).onConflictDoNothing({ target: users.email }).returning(userCols);
      return row ?? null;
    },
    async updateUserName(id, name, now) {
      const [row] = await db.update(users).set({ name, updatedAt: now }).where(eq(users.id, id)).returning(userCols);
      return row ?? null;
    },
    async setEmailUpdates(id, on, now) {
      // on again keeps the first yes: coalesce, so the record is when they first agreed
      const emailUpdatesAt = on ? sql`coalesce(${users.emailUpdatesAt}, ${now.toISOString()}::timestamptz)` : null;
      const [row] = await db.update(users).set({ emailUpdatesAt, updatedAt: now }).where(eq(users.id, id)).returning(userCols);
      return row ?? null;
    },
    async acceptTerms(id, version, now) {
      const [row] = await db.update(users).set({ termsAcceptedAt: now, termsVersion: version, updatedAt: now }).where(eq(users.id, id)).returning(userCols);
      return row ?? null;
    },
    async listPlans() {
      // price_cents and period are the old single price, kept only for the build before this one.
      const { updatedAt, priceCents, period, ...cols } = getTableColumns(plans);
      void updatedAt;
      void priceCents;
      void period;
      const rows = await db.select(cols).from(plans);
      return rows.map((p): Plan => ({ ...p, role: p.role === "student" ? "student" : "teacher" }));
    },
    async userById(id) {
      const [row] = await db.select(userCols).from(users).where(eq(users.id, id)).limit(1);
      return row ?? null;
    },
    async listUsers() {
      return db.select(userCols).from(users).orderBy(desc(users.createdAt));
    },
    async setUserPlan(id, planId, billing, role, now, endsAt = null) {
      const [row] = await db.update(users).set({ planId, billing, role, planEndsAt: endsAt, updatedAt: now }).where(eq(users.id, id)).returning(userCols);
      return row ?? null;
    },
    async setPermissions(id, permissions, now) {
      const [row] = await db.update(users).set({ permissions, updatedAt: now }).where(eq(users.id, id)).returning(userCols);
      return row ?? null;
    },
    async setStripeCustomer(id, customerId, now) {
      await db.update(users).set({ stripeCustomerId: customerId, updatedAt: now }).where(eq(users.id, id));
    },
    async userByStripeCustomer(customerId) {
      const [row] = await db.select(userCols).from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
      return row ?? null;
    },
    async setSubscription(id, subscriptionId, status, clearExempt, now) {
      const set = { stripeSubscriptionId: subscriptionId, subscriptionStatus: status, updatedAt: now, ...(clearExempt ? { paymentExempt: false } : {}) };
      const [row] = await db.update(users).set(set).where(eq(users.id, id)).returning(userCols);
      return row ?? null;
    },
    async recordPayment(p, now) {
      await db.insert(payments).values({ ...p, createdAt: now }).onConflictDoNothing({ target: payments.id });
    },
    async paymentsOf(userId) {
      const rows = await db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.paidAt));
      return rows.map(({ createdAt, ...p }) => (void createdAt, p));
    },
    async clearPaymentExempt(id, now) {
      await db.update(users).set({ paymentExempt: false, updatedAt: now }).where(eq(users.id, id));
    },
    async requestPlan(userId, planId, now) {
      await db.insert(planRequests).values({ userId, planId, createdAt: now }).onConflictDoNothing({ target: planRequests.userId });
    },
    async planRequest(userId) {
      const [row] = await db.select({ planId: planRequests.planId, createdAt: planRequests.createdAt }).from(planRequests).where(eq(planRequests.userId, userId)).limit(1);
      return row ?? null;
    },
    async addStudent(teacherId, studentId, now) {
      // no onConflictDoNothing: a student who already has a teacher is an error, not a silent no-op
      await db.insert(teacherStudents).values({ teacherId, studentId, createdAt: now });
    },
    async studentsOf(teacherId) {
      const rows = await db
        .select({ user: userCols, createdAt: teacherStudents.createdAt, claimedAt: teacherStudents.claimedAt, plannedOn: teacherStudents.plannedOn })
        .from(teacherStudents)
        .innerJoin(users, eq(users.id, teacherStudents.studentId))
        .where(eq(teacherStudents.teacherId, teacherId))
        .orderBy(desc(teacherStudents.createdAt));
      return rows;
    },
    async studentLink(teacherId, studentId) {
      const [row] = await db
        .select({ createdAt: teacherStudents.createdAt, claimedAt: teacherStudents.claimedAt })
        .from(teacherStudents)
        .where(and(eq(teacherStudents.teacherId, teacherId), eq(teacherStudents.studentId, studentId)))
        .limit(1);
      return row ?? null;
    },
    async markClaimed(studentId, now) {
      await db.update(teacherStudents).set({ claimedAt: now }).where(and(eq(teacherStudents.studentId, studentId), isNull(teacherStudents.claimedAt)));
    },
    async markPlanned(teacherId, studentId, day) {
      await db.update(teacherStudents).set({ plannedOn: day }).where(and(eq(teacherStudents.teacherId, teacherId), eq(teacherStudents.studentId, studentId)));
    },
    async teacherOf(studentId) {
      const [row] = await db
        .select(userCols)
        .from(teacherStudents)
        .innerJoin(users, eq(users.id, teacherStudents.teacherId))
        .where(eq(teacherStudents.studentId, studentId))
        .limit(1);
      return row ?? null;
    },
    async createInvite(input, now) {
      const [row] = await db.insert(teacherInvites).values({ ...input, createdAt: now }).returning({ id: teacherInvites.id });
      return { id: row.id, planId: input.planId, note: input.note, token: input.token, createdAt: now, claimedBy: null, claimedAt: null };
    },
    async listInvites() {
      const rows = await db.select(inviteCols).from(teacherInvites).leftJoin(users, eq(users.id, teacherInvites.claimedBy)).orderBy(desc(teacherInvites.createdAt));
      return rows.map(toInvite);
    },
    async inviteByHash(tokenHash) {
      const [row] = await invitesWhere(eq(teacherInvites.tokenHash, tokenHash)).limit(1);
      return row ? toInvite(row) : null;
    },
    async claimInvite(tokenHash, userId, now) {
      // one step: only an unused invite, or one this user used already, so two people can't both take it
      const [taken] = await db
        .update(teacherInvites)
        .set({ claimedBy: userId, claimedAt: sql`coalesce(${teacherInvites.claimedAt}, ${now.toISOString()}::timestamptz)` })
        .where(and(eq(teacherInvites.tokenHash, tokenHash), sql`(${teacherInvites.claimedBy} is null or ${teacherInvites.claimedBy} = ${userId})`))
        .returning({ id: teacherInvites.id });
      if (!taken) return null;
      const [row] = await invitesWhere(eq(teacherInvites.id, taken.id)).limit(1);
      return row ? toInvite(row) : null;
    },
    async deleteInvite(id) {
      await db.delete(teacherInvites).where(eq(teacherInvites.id, id));
    },
    async deleteUser(id) {
      await db.delete(users).where(eq(users.id, id));
    },
    async userFootprint(id) {
      const [user] = await db.select(userCols).from(users).where(eq(users.id, id)).limit(1);
      if (!user) return null;
      // One statement, not a query per table: run side by side, many queries stall on Supabase's transaction pooler.
      const rows = (await db.execute(sql`
        select
          (select count(*)::int from sessions where user_id = ${id}) as sessions,
          (select count(*)::int from identities where user_id = ${id}) as identities,
          (select count(*)::int from auth_tokens where email = ${user.email}) as tokens,
          (select count(*)::int from teacher_invites where claimed_by = ${id}) as invites,
          (select count(*)::int from teacher_students where teacher_id = ${id}) as students,
          (select count(*)::int from teacher_students where student_id = ${id}) as teacher,
          (select count(*)::int from plan_requests where user_id = ${id}) as "planRequest",
          (select coalesce(array_agg(kind order by kind), '{}') from user_documents where user_id = ${id}) as documents,
          (select count(*)::int from progress_entries where user_id = ${id}) as progress,
          (select count(*)::int from plan_day_times where user_id = ${id}) as "dayTimes",
          (select count(*)::int from videos where user_id = ${id}) as videos,
          (select count(*)::int from shares where user_id = ${id}) as shares,
          (select count(*)::int from plan_claims where user_id = ${id}) as "planClaims",
          (select count(*)::int from message_threads where user_id = ${id}) as threads,
          (select count(*)::int from messages m join message_threads t on t.id = m.thread_id where t.user_id = ${id}) as messages,
          (select count(*)::int from user_voices where user_id = ${id}) as voice,
          (select count(*)::int from reminders where user_id = ${id}) as reminder,
          (select count(*)::int from block_owners where user_id = ${id}) as blocks,
          (select count(*)::int from payments where user_id = ${id}) as payments
      `)) as unknown as Omit<UserFootprint, "user">[];
      const r = rows[0];
      return { user, ...r };
    },
    async purgeUser(id) {
      return db.transaction(async (tx) => {
        const [user] = await tx.select({ email: users.email }).from(users).where(eq(users.id, id)).limit(1);
        if (!user) return false;
        await tx.delete(teacherInvites).where(eq(teacherInvites.claimedBy, id));
        await tx.delete(authTokens).where(eq(authTokens.email, user.email));
        // the database cascades the rest: sessions, identities, documents, progress, videos, shares, threads, links; payments keep their row
        await tx.delete(users).where(eq(users.id, id));
        return true;
      });
    },
    async userByIdentity(provider, providerAccountId) {
      const [row] = await db
        .select(userCols)
        .from(identities)
        .innerJoin(users, eq(users.id, identities.userId))
        .where(and(eq(identities.provider, provider), eq(identities.providerAccountId, providerAccountId)))
        .limit(1);
      return row ?? null;
    },
    async linkIdentity(userId, provider, providerAccountId, now) {
      await db.insert(identities).values({ userId, provider, providerAccountId, createdAt: now }).onConflictDoNothing();
    },
    async createToken(token, now) {
      await db.insert(authTokens).values({ ...token, createdAt: now });
    },
    async countTokens(email, kind, since) {
      const [row] = await db.select({ n: count() }).from(authTokens).where(and(eq(authTokens.email, email), eq(authTokens.kind, kind), gte(authTokens.createdAt, since)));
      return row?.n ?? 0;
    },
    async lastTokenAt(email, kind) {
      const [row] = await db.select({ at: max(authTokens.createdAt) }).from(authTokens).where(and(eq(authTokens.email, email), eq(authTokens.kind, kind)));
      return row?.at ?? null;
    },
    async peekToken(hash, kind, now) {
      const [row] = await db.select(tokenCols).from(authTokens).where(liveToken(hash, kind, now)).limit(1);
      return row ?? null;
    },
    async takeToken(hash, kind, now) {
      const [row] = await db.update(authTokens).set({ usedAt: now }).where(liveToken(hash, kind, now)).returning(tokenCols);
      return row ?? null;
    },
    async tryCodes(email, maxTries, now) {
      return db
        .update(authTokens)
        .set({ tries: sql`${authTokens.tries} + 1` })
        .where(and(eq(authTokens.email, email), eq(authTokens.kind, "email_link"), isNotNull(authTokens.codeHash), isNull(authTokens.usedAt), gt(authTokens.expiresAt, now), lt(authTokens.tries, maxTries)))
        .returning(tokenCols);
    },
    async createSession(session, now) {
      await db.insert(sessions).values({ ...session, createdAt: now, lastSeenAt: now });
    },
    async sessionUser(hash, now) {
      const [row] = await db
        .select({ user: userCols, expiresAt: sessions.expiresAt })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(and(eq(sessions.tokenHash, hash), gt(sessions.expiresAt, now)))
        .limit(1);
      return row ?? null;
    },
    async touchSession(hash, expiresAt, now) {
      await db.update(sessions).set({ expiresAt, lastSeenAt: now }).where(eq(sessions.tokenHash, hash));
    },
    async listSessionTimes() {
      const rows = await db
        .select({ userId: sessions.userId, lastLogin: max(sessions.createdAt), lastSeen: max(sessions.lastSeenAt) })
        .from(sessions)
        .groupBy(sessions.userId);
      // max() over a group is never null here: every row has both columns.
      return rows.map((r) => ({ userId: r.userId, lastLogin: r.lastLogin!, lastSeen: r.lastSeen! }));
    },
    async deleteSession(hash) {
      await db.delete(sessions).where(eq(sessions.tokenHash, hash));
    },
    async deleteExpired(now) {
      await db.delete(sessions).where(lte(sessions.expiresAt, now));
      await db.delete(authTokens).where(lte(authTokens.expiresAt, now));
    },
  };
}
