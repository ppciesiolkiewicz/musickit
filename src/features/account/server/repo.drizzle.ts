import { and, count, eq, gt, gte, isNull, lte } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { authTokens, identities, sessions, users } from "@/lib/db/schema";
import type { AuthRepo, TokenRow } from "./repo";

const userCols = { id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt };

const tokenCols = {
  kind: authTokens.kind,
  tokenHash: authTokens.tokenHash,
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
    async peekToken(hash, kind, now) {
      const [row] = await db.select(tokenCols).from(authTokens).where(liveToken(hash, kind, now)).limit(1);
      return row ?? null;
    },
    async takeToken(hash, kind, now) {
      const [row] = await db.update(authTokens).set({ usedAt: now }).where(liveToken(hash, kind, now)).returning(tokenCols);
      return row ?? null;
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
