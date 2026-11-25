import type { Plan } from "../plans";
import type { AuthRepo, InviteRow, PaymentRow, PlanRequest, TokenRow, UserRow } from "./repo";

/** The repo in memory, for tests. Same rules as the Postgres one: one user per email, a token is taken once. */
export function memoryRepo(plans: Plan[] = []) {
  const users: UserRow[] = [];
  const identities: { userId: string; provider: string; providerAccountId: string }[] = [];
  const tokens: (TokenRow & { createdAt: Date; usedAt: Date | null; tries: number })[] = [];
  const sessions: { tokenHash: string; userId: string; expiresAt: Date; createdAt: Date; lastSeenAt: Date }[] = [];
  const links: { teacherId: string; studentId: string; createdAt: Date; claimedAt: Date | null; plannedOn: string | null }[] = [];
  const planRequests: (PlanRequest & { userId: string })[] = [];
  const payments: PaymentRow[] = [];
  const invites: { id: string; token: string | null; tokenHash: string; planId: string; note: string; createdAt: Date; claimedBy: string | null; claimedAt: Date | null }[] = [];
  let n = 0;

  const toInvite = ({ tokenHash, claimedBy, ...row }: (typeof invites)[number]): InviteRow => {
    void tokenHash;
    const user = claimedBy ? users.find((u) => u.id === claimedBy) : null;
    return { ...row, claimedBy: user ? { id: user.id, email: user.email, name: user.name } : null };
  };

  const live = (hash: string, kind: string, now: Date) => tokens.find((t) => t.tokenHash === hash && t.kind === kind && !t.usedAt && t.expiresAt > now) ?? null;

  const repo: AuthRepo = {
    async userByEmail(email) {
      return users.find((u) => u.email === email) ?? null;
    },
    async createUser(input, now) {
      if (users.some((u) => u.email === input.email)) return null;
      const user: UserRow = { id: `user-${++n}`, ...input, permissions: [], planId: null, billing: "year", paymentExempt: false, planEndsAt: null, stripeCustomerId: null, stripeSubscriptionId: null, subscriptionStatus: null, emailUpdatesAt: null, termsAcceptedAt: null, termsVersion: null, createdAt: now };
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
    async acceptTerms(id, version, now) {
      const user = users.find((u) => u.id === id);
      if (!user) return null;
      user.termsAcceptedAt = now;
      user.termsVersion = version;
      return user;
    },
    async listPlans() {
      return plans;
    },
    async userById(id) {
      return users.find((u) => u.id === id) ?? null;
    },
    async listUsers() {
      return [...users].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    async setUserPlan(id, planId, billing, role, _now, endsAt = null) {
      const user = users.find((u) => u.id === id);
      if (!user) return null;
      user.planId = planId;
      user.planEndsAt = endsAt;
      user.billing = billing;
      user.role = role;
      return user;
    },
    async setPermissions(id, permissions) {
      const user = users.find((u) => u.id === id);
      if (!user) return null;
      user.permissions = [...permissions];
      return user;
    },
    async setStripeCustomer(id, customerId) {
      const user = users.find((u) => u.id === id);
      if (user) user.stripeCustomerId = customerId;
    },
    async userByStripeCustomer(customerId) {
      return users.find((u) => u.stripeCustomerId === customerId) ?? null;
    },
    async setSubscription(id, subscriptionId, status, clearExempt) {
      const user = users.find((u) => u.id === id);
      if (!user) return null;
      user.stripeSubscriptionId = subscriptionId;
      user.subscriptionStatus = status;
      if (clearExempt) user.paymentExempt = false;
      return user;
    },
    async recordPayment(p) {
      if (!payments.some((x) => x.id === p.id)) payments.push({ ...p });
    },
    async paymentsOf(userId) {
      return payments.filter((x) => x.userId === userId).sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());
    },
    async clearPaymentExempt(id) {
      const user = users.find((u) => u.id === id);
      if (user) user.paymentExempt = false;
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
      links.push({ teacherId, studentId, createdAt: now, claimedAt: null, plannedOn: null });
    },
    async studentsOf(teacherId) {
      return links
        .filter((l) => l.teacherId === teacherId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .flatMap((l) => {
          const user = users.find((u) => u.id === l.studentId);
          return user ? [{ user, createdAt: l.createdAt, claimedAt: l.claimedAt, plannedOn: l.plannedOn }] : [];
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
    async markPlanned(teacherId, studentId, day) {
      const l = links.find((x) => x.teacherId === teacherId && x.studentId === studentId);
      if (l) l.plannedOn = day;
    },
    async teacherOf(studentId) {
      const l = links.find((x) => x.studentId === studentId);
      return (l && users.find((u) => u.id === l.teacherId)) ?? null;
    },
    async createInvite(input, now) {
      const row = { id: `invite-${++n}`, ...input, createdAt: now, claimedBy: null, claimedAt: null };
      invites.push(row);
      return toInvite(row);
    },
    async listInvites() {
      return [...invites].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(toInvite);
    },
    async inviteByHash(tokenHash) {
      const row = invites.find((i) => i.tokenHash === tokenHash);
      return row ? toInvite(row) : null;
    },
    async claimInvite(tokenHash, userId, now) {
      const row = invites.find((i) => i.tokenHash === tokenHash);
      if (!row || (row.claimedBy !== null && row.claimedBy !== userId)) return null;
      row.claimedBy = userId;
      row.claimedAt ??= now;
      return toInvite(row);
    },
    async deleteInvite(id) {
      const i = invites.findIndex((x) => x.id === id);
      if (i >= 0) invites.splice(i, 1);
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
      sessions.push({ tokenHash: session.tokenHash, userId: session.userId, expiresAt: session.expiresAt, createdAt: now, lastSeenAt: now });
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
    async listSessionTimes() {
      const by = new Map<string, { userId: string; lastLogin: Date; lastSeen: Date }>();
      for (const s of sessions) {
        const t = by.get(s.userId);
        if (!t) by.set(s.userId, { userId: s.userId, lastLogin: s.createdAt, lastSeen: s.lastSeenAt });
        else {
          if (s.createdAt > t.lastLogin) t.lastLogin = s.createdAt;
          if (s.lastSeenAt > t.lastSeen) t.lastSeen = s.lastSeenAt;
        }
      }
      return [...by.values()];
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
  return { repo, users, identities, tokens, sessions, planRequests, payments, links, invites };
}
