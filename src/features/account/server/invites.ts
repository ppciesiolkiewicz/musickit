import { cleanName, type Account } from "../model";
import { PERSONAL_DEMO_PLAN_ID, roleOnPlan, TAUGHT_PLAN_ID, TEACHER_DEMO_PLAN_ID, type Plan } from "../plans";
import { TERMS_UPDATED } from "../terms";
import { hashToken, toAccount, type AuthDeps } from "./auth";
import type { InviteKind } from "../emailHtml";
import type { InviteRow } from "./repo";

/**
 * Invites: a link we make on /admin/invites and send someone, so they can try the app on a plan no one can choose. A
 * teacher invite gives the Teacher Demo (2 students, free); a personal invite gives the Personal Demo (a player's own
 * plan, free). The link is `/join/<token>`; the token is kept beside its hash
 * (the hash finds it), so /admin/invites can copy the link again. One invite, one account: the first signed-in person to join with it keeps it.
 *
 * Rules only, like auth.ts: no Request and no SQL.
 */

/** What /admin/invites lists: an invite with its token (admin only), dates as ISO strings. */
export type InviteListing = Omit<InviteRow, "createdAt" | "claimedAt"> & { createdAt: string; claimedAt: string | null };

const listing = (i: InviteRow): InviteListing => ({ ...i, createdAt: i.createdAt.toISOString(), claimedAt: i.claimedAt?.toISOString() ?? null });

/** Who an invite is for: a teacher (Teacher Demo) or a player on their own (Personal Demo). */
export type { InviteKind };

const PLAN_OF: Record<InviteKind, string> = { teacher: TEACHER_DEMO_PLAN_ID, personal: PERSONAL_DEMO_PLAN_ID };

/** The invite kind a plan gives: a teacher plan makes a teacher invite. */
export const kindOf = (plan: Pick<Plan, "role">): InviteKind => (plan.role === "teacher" ? "teacher" : "personal");

/**
 * A new invite: onto the Teacher Demo plan, or the Personal Demo with `kind` "personal" (anything else is a teacher
 * invite, as before kinds). `note` says who it is for. The token is kept so the link can be copied again.
 */
export async function makeInvite(deps: AuthDeps, note: unknown, kind: unknown = "teacher"): Promise<{ token: string; invite: InviteListing }> {
  const token = deps.token();
  const planId = PLAN_OF[kind === "personal" ? "personal" : "teacher"];
  const invite = await deps.repo.createInvite({ token, tokenHash: hashToken(token), planId, note: cleanName(note) }, deps.now());
  return { token, invite: listing(invite) };
}

export const listInvites = async (deps: AuthDeps): Promise<InviteListing[]> => (await deps.repo.listInvites()).map(listing);

/** How an invite looks to the person who opened it. */
export type InviteState = "open" | "yours" | "used" | "not-found";

/** What `/join/<token>` shows: the invite's state, its plan (name and students) and who it is for (its note), if we said. */
export interface InviteView {
  state: InviteState;
  /** null when the invite isn't found */
  kind: InviteKind | null;
  plan: Pick<Plan, "name" | "students"> | null;
  name: string | null;
}

/** The token's hash, or null for anything that can't be a token. */
const hashOf = (token: unknown): string | null => (typeof token === "string" && token.length > 0 && token.length <= 200 ? hashToken(token) : null);

const find = async (deps: AuthDeps, hash: string | null) => (hash ? deps.repo.inviteByHash(hash) : null);

const stateFor = (invite: InviteRow | null, userId: string | null): InviteState =>
  !invite ? "not-found" : invite.claimedBy === null ? "open" : invite.claimedBy.id === userId ? "yours" : "used";

/** The invite as `/join/<token>` shows it to this person, or to a visitor not logged in yet (`null`). */
export async function viewInvite(deps: AuthDeps, account: Account | null, token: unknown): Promise<InviteView> {
  const invite = await find(deps, hashOf(token));
  const plan = invite && (await deps.repo.listPlans()).find((p) => p.id === invite.planId);
  if (!invite || !plan) return { state: "not-found", kind: null, plan: null, name: null };
  const state = stateFor(invite, account?.id ?? null);
  // the name is for the person it was made for: not shown to someone else on a used link
  return { state, kind: kindOf(plan), plan: { name: plan.name, students: plan.students }, name: state === "used" ? null : invite.note || null };
}

export type JoinError = "not-found" | "used" | "taught" | "name" | "terms";

/**
 * Joins with the invite: the person moves to its plan, with the role it gives (an owner stays an owner), paid the way they
 * were (nothing is charged). A new account, with no plan yet, also gives its name and agrees to the terms here, as on
 * /account/setup, so it never has to choose a plan there. A student of a teacher (the `taught` plan) can't join: their
 * account belongs to their teacher's class. Everything is checked before the invite is taken; joining again with the
 * same invite changes nothing.
 */
export async function joinWithInvite(
  deps: AuthDeps,
  account: Account,
  token: unknown,
  input: { name?: unknown; acceptTerms?: unknown; emailUpdates?: unknown },
): Promise<{ ok: true; account: Account } | { ok: false; error: JoinError }> {
  const hash = hashOf(token);
  const invite = await find(deps, hash);
  const plan = invite && (await deps.repo.listPlans()).find((p) => p.id === invite.planId);
  const user = await deps.repo.userById(account.id);
  if (!hash || !invite || !plan || !user) return { ok: false, error: "not-found" };
  const state = stateFor(invite, user.id);
  if (state === "used") return { ok: false, error: "used" };
  if (state === "yours" && user.planId === plan.id) return { ok: true, account: toAccount(user) };
  if (user.planId === TAUGHT_PLAN_ID) return { ok: false, error: "taught" };
  const setup = user.planId === null;
  const name = cleanName(input.name);
  if (setup && !name) return { ok: false, error: "name" };
  if (setup && input.acceptTerms !== true) return { ok: false, error: "terms" };

  const now = deps.now();
  if (!(await deps.repo.claimInvite(hash, user.id, now))) return { ok: false, error: "used" };
  if (setup) {
    await deps.repo.updateUserName(user.id, name, now);
    await deps.repo.acceptTerms(user.id, TERMS_UPDATED, now);
    if (typeof input.emailUpdates === "boolean") await deps.repo.setEmailUpdates(user.id, input.emailUpdates, now);
  }
  const moved = await deps.repo.setUserPlan(user.id, plan.id, user.billing, roleOnPlan(user.role, plan), now);
  return moved ? { ok: true, account: toAccount(moved) } : { ok: false, error: "not-found" };
}
