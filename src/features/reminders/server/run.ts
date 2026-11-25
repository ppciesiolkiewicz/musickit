import { planWantsReminder, reminderBody } from "@/features/plan/model/reminder";
import type { PlanState } from "@/features/plan/model/types";
import { dueOn } from "../model";
import { reminderEmail } from "./mail";
import type { ReminderRepo } from "./repo";
import { offToken } from "./token";

export interface RunDeps {
  repo: ReminderRepo;
  /** the player's plan, sanitised */
  planOf(userId: string): Promise<PlanState>;
  accountOf(userId: string): Promise<{ email: string; taught: boolean } | null>;
  /** throws on failure, as `sendMail` does */
  mail(m: ReturnType<typeof reminderEmail>): Promise<"sent" | "off">;
  base: string;
  offSecret: string;
  env: Record<string, string | undefined>;
}

export interface RunResult { due: number; emailed: number; skipped: number; failed: number }

/**
 * Sends every reminder due now, once. Each is claimed (its `sentOn` set) before the email goes, so a second run, or one
 * at the same time, skips it; a failed send is unclaimed so a retry within `SEND_WINDOW` tries again. Never throws:
 * one player's failure is counted and the run goes on.
 */
export async function runReminders(deps: RunDeps, now: Date): Promise<RunResult> {
  const out: RunResult = { due: 0, emailed: 0, skipped: 0, failed: 0 };
  for (const r of await deps.repo.listEnabled()) {
    const date = dueOn(r, now);
    if (!date) continue;
    out.due++;
    try {
      const account = await deps.accountOf(r.userId);
      if (!account) { out.skipped++; continue; }
      const plan = await deps.planOf(r.userId);
      if (!planWantsReminder(plan, date, account.taught)) { out.skipped++; continue; }
      if (!(await deps.repo.claim(r.userId, date))) { out.skipped++; continue; }
      try {
        const body = reminderBody(plan, date, account.taught);
        const sent = await deps.mail(reminderEmail(account.email, body, deps.base, offToken(r.userId, deps.offSecret), deps.env));
        if (sent === "sent") out.emailed++;
        else { await deps.repo.unclaim(r.userId, r.sentOn); out.skipped++; }
      } catch (e) {
        await deps.repo.unclaim(r.userId, r.sentOn);
        throw e;
      }
    } catch (e) {
      out.failed++;
      console.error("reminder failed", r.userId, e instanceof Error ? e.message : e);
    }
  }
  return out;
}
