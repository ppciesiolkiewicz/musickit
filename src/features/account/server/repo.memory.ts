import type { AuthRepo, TokenRow, UserRow } from "./repo";

/** The repo in memory, for tests. Same rules as the Postgres one: one user per email, a token is taken once. */
export function memoryRepo() {
  const users: UserRow[] = [];
  const identities: { userId: string; provider: string; providerAccountId: string }[] = [];
  const tokens: (TokenRow & { createdAt: Date; usedAt: Date | null })[] = [];
  const sessions: { tokenHash: string; userId: string; expiresAt: Date; lastSeenAt: Date }[] = [];
  let n = 0;

  const live = (hash: string, kind: string, now: Date) => tokens.find((t) => t.tokenHash === hash && t.kind === kind && !t.usedAt && t.expiresAt > now) ?? null;

  const repo: AuthRepo = {
    async userByEmail(email) {
      return users.find((u) => u.email === email) ?? null;
    },
    async createUser(input, now) {
      if (users.some((u) => u.email === input.email)) return null;
      const user: UserRow = { id: `user-${++n}`, ...input, createdAt: now };
      users.push(user);
      return user;
    },
    async updateUserName(id, name) {
      const user = users.find((u) => u.id === id);
      if (!user) return null;
      user.name = name;
      return user;
    },
    async deleteUser(id) {
      for (const list of [identities, sessions]) for (let i = list.length - 1; i >= 0; i--) if (list[i].userId === id) list.splice(i, 1);
      const i = users.findIndex((u) => u.id === id);
      if (i >= 0) users.splice(i, 1);
    },
    async userByIdentity(provider, providerAccountId) {
      const link = identities.find((x) => x.provider === provider && x.providerAccountId === providerAccountId);
      return (link && users.find((u) => u.id === link.userId)) ?? null;
    },
    async linkIdentity(userId, provider, providerAccountId) {
      if (!identities.some((x) => x.provider === provider && x.providerAccountId === providerAccountId)) identities.push({ userId, provider, providerAccountId });
    },
    async createToken(token, now) {
      tokens.push({ ...token, createdAt: now, usedAt: null });
    },
    async countTokens(email, kind, since) {
      return tokens.filter((t) => t.email === email && t.kind === kind && t.createdAt >= since).length;
    },
    async peekToken(hash, kind, now) {
      return live(hash, kind, now);
    },
    async takeToken(hash, kind, now) {
      const token = live(hash, kind, now);
      if (token) token.usedAt = now;
      return token;
    },
    async createSession(session, now) {
      sessions.push({ tokenHash: session.tokenHash, userId: session.userId, expiresAt: session.expiresAt, lastSeenAt: now });
    },
    async sessionUser(hash, now) {
      const s = sessions.find((x) => x.tokenHash === hash && x.expiresAt > now);
      const user = s && users.find((u) => u.id === s.userId);
      return s && user ? { user, expiresAt: s.expiresAt } : null;
    },
    async touchSession(hash, expiresAt, now) {
      const s = sessions.find((x) => x.tokenHash === hash);
      if (s) Object.assign(s, { expiresAt, lastSeenAt: now });
    },
    async deleteSession(hash) {
      const i = sessions.findIndex((x) => x.tokenHash === hash);
      if (i >= 0) sessions.splice(i, 1);
    },
    async deleteExpired(now) {
      for (let i = sessions.length - 1; i >= 0; i--) if (sessions[i].expiresAt <= now) sessions.splice(i, 1);
      for (let i = tokens.length - 1; i >= 0; i--) if (tokens[i].expiresAt <= now) tokens.splice(i, 1);
    },
  };
  return { repo, users, identities, tokens, sessions };
}
