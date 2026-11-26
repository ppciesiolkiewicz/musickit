import type { UserFootprint } from "@/features/account/server/repo";

/** "1 video", "3 videos". */
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Stripe statuses that still charge, or will. */
const LIVE = new Set(["trialing", "active", "past_due", "unpaid", "incomplete"]);

/**
 * What the delete question on /admin/admin/users lists: `gone`, what is deleted (only what they have); `kept`, what
 * stays; `warning`, a Stripe subscription deleting doesn't stop. `f` comes from `GET /api/admin/users/<id>` as JSON.
 */
export function deleteLines(f: UserFootprint): { gone: string[]; kept: string[]; warning: string | null } {
  const gone: string[] = [`The account: ${f.user.name}, ${f.user.email}`];
  const add = (n: number, line: string) => n > 0 && gone.push(line);
  add(f.sessions, `${count(f.sessions, "logged-in browser")}, logged out`);
  add(f.identities, count(f.identities, "linked Google log-in"));
  add(f.tokens, count(f.tokens, "email log-in link"));
  add(f.invites, count(f.invites, "invite they joined with"));
  if (f.documents.length) gone.push(`Their data: ${f.documents.join(", ")}`);
  add(f.progress, `Progress on ${count(f.progress, "exercise")}`);
  add(f.dayTimes, `Practice time on ${count(f.dayTimes, "plan day")}`);
  add(f.videos, `${count(f.videos, "video")}, with the files`);
  add(f.shares, count(f.shares, "shared link"));
  add(f.planClaims, count(f.planClaims, "shared plan they took"));
  add(f.threads, `${count(f.threads, "message thread")} with ${count(f.messages, "message")}`);
  add(f.voice, "Their singing voice");
  add(f.reminder, "Their daily reminder");
  add(f.planRequest, "Their request for a plan priced with them");
  add(f.teacher, "Their link to their teacher");
  add(f.blocks, `Their copy of ${count(f.blocks, "exercise")} (the exercises stay in the library)`);
  const kept: string[] = [];
  if (f.students) kept.push(f.students === 1 ? "1 student loses their teacher. Their account stays." : `${f.students} students lose their teacher. Their accounts stay.`);
  if (f.payments) kept.push(f.payments === 1 ? "1 payment record stays, with no account on it." : `${f.payments} payment records stay, with no account on them.`);
  const status = f.user.subscriptionStatus;
  const warning = status && LIVE.has(status) ? `Their Stripe subscription is ${status.replace("_", " ")}. Deleting the account doesn't cancel it: cancel it in Stripe first.` : null;
  return { gone, kept, warning };
}
