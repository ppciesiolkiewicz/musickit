import { auth, baseUrl } from "@/features/account/server/http";
import { sendMail } from "@/features/account/server/mail";
import { sanitiseState } from "@/features/plan/model/state";
import { TAUGHT_PLAN_ID } from "@/features/account/plans";
import { readDoc } from "@/features/userData/server/data";
import { userData } from "@/features/userData/server/http";
import { getDb } from "@/lib/db/client";
import { drizzleReminderRepo } from "./repo.drizzle";
import type { ReminderRepo } from "./repo";
import type { RunDeps } from "./run";

export function reminderRepo(): ReminderRepo | null {
  const db = getDb();
  return db ? drizzleReminderRepo(db) : null;
}

/** The run's real deps, or null without a database, accounts or REMINDER_UNSUBSCRIBE_SECRET. */
export function runDeps(req: Request): RunDeps | null {
  const repo = reminderRepo();
  const a = auth();
  const store = userData();
  const offSecret = process.env.REMINDER_UNSUBSCRIBE_SECRET?.trim();
  if (!repo || !a || !store || !offSecret) return null;
  return {
    repo,
    planOf: async (id) => sanitiseState(await readDoc(store.repo, id, "plan")),
    accountOf: async (id) => {
      const u = await a.repo.userById(id);
      return u && { email: u.email, taught: u.planId === TAUGHT_PLAN_ID };
    },
    mail: (m) => sendMail(m),
    base: baseUrl(req),
    offSecret,
    env: process.env,
  };
}
