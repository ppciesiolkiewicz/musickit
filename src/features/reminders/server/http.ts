import { timingSafeEqual } from "node:crypto";
import { json, readJson } from "@/features/account/server/http";
import { signedIn } from "@/features/userData/server/http";
import type { AuthDeps } from "@/features/account/server/auth";
import { cleanSettings } from "../model";
import type { ReminderRepo } from "./repo";
import { runReminders, type RunDeps } from "./run";
import { readOffToken } from "./token";

type Env = Record<string, string | undefined>;

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * The scheduler's call: 503 without CRON_SECRET, 401 without its bearer, else the run's counts: 200, or 500 when any
 * email failed, so the scheduler marks the run failed and can say so.
 */
export async function cronRoute(run: () => RunDeps | null, req: Request, env: Env, now: Date): Promise<Response> {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return json({ error: "CRON_SECRET is not set." }, 503);
  if (!same(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) return json({ error: "Unauthorized." }, 401);
  const deps = run();
  if (!deps) return json({ error: "No database or SERVER_SIGNING_KEY." }, 503);
  const result = await runReminders(deps, now);
  return json(result, result.failed > 0 ? 500 : 200);
}

/** GET: the signed-in player's reminder, `{ reminder: { enabled, time, zone } | null }`. */
export async function getRoute(repo: ReminderRepo, auth: AuthDeps | null, req: Request): Promise<Response> {
  const s = await signedIn(req, auth);
  if (s instanceof Response) return s;
  const r = await repo.get(s.account.id);
  return json({ reminder: r && { enabled: r.enabled, time: r.time, zone: r.zone } }, 200, s.cookies);
}

/** PATCH `{ enabled, time, zone }` (all three): 400 when any part is wrong, else the saved settings. */
export async function putRoute(repo: ReminderRepo, auth: AuthDeps | null, req: Request, now: Date): Promise<Response> {
  const s = await signedIn(req, auth);
  if (s instanceof Response) return s;
  const clean = cleanSettings(await readJson(req));
  if (!clean) return json({ error: "Pick a time on the quarter hour." }, 400, s.cookies);
  const r = await repo.put(s.account.id, clean, now);
  return json({ reminder: { enabled: r.enabled, time: r.time, zone: r.zone } }, 200, s.cookies);
}

/** POST `?token=`: the unsubscribe button and mail programs' one-click unsubscribe. No login; the token is the proof. */
export async function offRoute(repo: ReminderRepo, req: Request, env: Env, now: Date): Promise<Response> {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const userId = readOffToken(token, env.SERVER_SIGNING_KEY?.trim() ?? "");
  if (!userId) return json({ error: "This link doesn't work. Turn reminder emails off on the Practice plan page." }, 400);
  await repo.turnOff(userId, now);
  return json({ ok: true });
}
