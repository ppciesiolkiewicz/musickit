import { and, count, eq, getTableColumns, gt, gte, isNotNull, isNull, lt, lte, max, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { authTokens, identities, plans, sessions, users } from "@/lib/db/schema";
import type { Plan } from "../plans";
import type { AuthRepo, TokenRow } from "./repo";

const userCols = { id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt };

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

/** The repo over Postgres. */
export function drizzleRepo(db: Db): AuthRepo {
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
    async listPlans() {
      // new_plan_percent is an internal cost lever: it stays off `Plan`, which reaches the browser.
      const { updatedAt, newPlanPercent, ...cols } = getTableColumns(plans);
      void updatedAt;
      void newPlanPercent;
      const rows = await db.select(cols).from(plans);
      return rows.map((p): Plan => ({ ...p, role: p.role === "student" ? "student" : "teacher" }));
    },
    async userPlanId(id) {
      const [row] = await db.select({ planId: users.planId }).from(users).where(eq(users.id, id)).limit(1);
      return row?.planId ?? null;
    },
    async setUserPlan(id, planId, role, now) {
      const [row] = await db.update(users).set({ planId, role, updatedAt: now }).where(eq(users.id, id)).returning(userCols);
      return row ?? null;
    },
    async deleteUser(id) {
      await db.delete(users).where(eq(users.id, id));
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
    async deleteSession(hash) {
      await db.delete(sessions).where(eq(sessions.tokenHash, hash));
    },
    async deleteExpired(now) {
      await db.delete(sessions).where(lte(sessions.expiresAt, now));
      await db.delete(authTokens).where(lte(authTokens.expiresAt, now));
    },
  };
}
