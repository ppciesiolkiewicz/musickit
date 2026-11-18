import type { Plan } from "../plans";
import type { AuthRepo, PlanRequest, TokenRow, UserRow } from "./repo";

/** The repo in memory, for tests. Same rules as the Postgres one: one user per email, a token is taken once. */
export function memoryRepo(plans: Plan[] = []) {
  const users: UserRow[] = [];
  const identities: { userId: string; provider: string; providerAccountId: string }[] = [];
  const tokens: (TokenRow & { createdAt: Date; usedAt: Date | null; tries: number })[] = [];
  const sessions: { tokenHash: string; userId: string; expiresAt: Date; lastSeenAt: Date }[] = [];
  const links: { teacherId: string; studentId: string; createdAt: Date; claimedAt: Date | null }[] = [];
  const planRequests: (PlanRequest & { userId: string })[] = [];
  let n = 0;

  const live = (hash: string, kind: string, now: Date) => tokens.find((t) => t.tokenHash === hash && t.kind === kind && !t.usedAt && t.expiresAt > now) ?? null;

  const repo: AuthRepo = {
    async userByEmail(email) {
      return users.find((u) => u.email === email) ?? null;
    },
    async createUser(input, now) {
      if (users.some((u) => u.email === input.email)) return null;
      const user: UserRow = { id: `user-${++n}`, ...input, planId: null, billing: "year", emailUpdatesAt: null, createdAt: now };
      users.push(user);
      return user;
    },
    async updateUserName(id, name) {
      const user = users.find((u) => u.id === id);
      if (!user) return null;
      user.name = name;
      return user;
    },
    async setEmailUpdates(id, on, now) {
      const user = users.find((u) => u.id === id);
      if (!user) return null;
      user.emailUpdatesAt = on ? (user.emailUpdatesAt ?? now) : null;
      return user;
    },
    async listPlans() {
      return plans;
    },
    async userById(id) {
      return users.find((u) => u.id === id) ?? null;
    },
    async setUserPlan(id, planId, billing, role) {
      const user = users.find((u) => u.id === id);
      if (!user) return null;
      user.planId = planId;
      user.billing = billing;
      user.role = role;
      return user;
    },
    async requestPlan(userId, planId, now) {
      if (!planRequests.some((r) => r.userId === userId)) planRequests.push({ userId, planId, createdAt: now });
    },
    async planRequest(userId) {
      const r = planRequests.find((x) => x.userId === userId);
      return r ? { planId: r.planId, createdAt: r.createdAt } : null;
    },
    async addStudent(teacherId, studentId, now) {
      if (links.some((l) => l.studentId === studentId)) throw new Error("student already has a teacher");
      links.push({ teacherId, studentId, createdAt: now, claimedAt: null });
    },
    async studentsOf(teacherId) {
      return links
        .filter((l) => l.teacherId === teacherId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .flatMap((l) => {
          const user = users.find((u) => u.id === l.studentId);
          return user ? [{ user, createdAt: l.createdAt, claimedAt: l.claimedAt }] : [];
        });
    },
    async studentLink(teacherId, studentId) {
      const l = links.find((x) => x.teacherId === teacherId && x.studentId === studentId);
      return l ? { createdAt: l.createdAt, claimedAt: l.claimedAt } : null;
    },
    async markClaimed(studentId, now) {
      const l = links.find((x) => x.studentId === studentId);
      if (l && !l.claimedAt) l.claimedAt = now;
    },
    async teacherOf(studentId) {
      const l = links.find((x) => x.studentId === studentId);
      return (l && users.find((u) => u.id === l.teacherId)) ?? null;
    },
    async deleteUser(id) {
      for (let i = links.length - 1; i >= 0; i--) if (links[i].teacherId === id || links[i].studentId === id) links.splice(i, 1);
      for (const list of [identities, sessions, planRequests]) for (let i = list.length - 1; i >= 0; i--) if (list[i].userId === id) list.splice(i, 1);
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
      tokens.push({ ...token, createdAt: now, usedAt: null, tries: 0 });
    },
    async countTokens(email, kind, since) {
      return tokens.filter((t) => t.email === email && t.kind === kind && t.createdAt >= since).length;
    },
    async lastTokenAt(email, kind) {
      const times = tokens.filter((t) => t.email === email && t.kind === kind).map((t) => t.createdAt.getTime());
      return times.length ? new Date(Math.max(...times)) : null;
    },
    async peekToken(hash, kind, now) {
      return live(hash, kind, now);
    },
    async takeToken(hash, kind, now) {
      const token = live(hash, kind, now);
      if (token) token.usedAt = now;
      return token;
    },
    async tryCodes(email, maxTries, now) {
      const open = tokens.filter((t) => t.email === email && t.kind === "email_link" && t.codeHash && !t.usedAt && t.expiresAt > now && t.tries < maxTries);
      for (const t of open) t.tries++;
      return open;
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
  return { repo, users, identities, tokens, sessions, planRequests, links };
}
