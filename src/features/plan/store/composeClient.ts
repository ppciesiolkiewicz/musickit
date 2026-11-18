import { accountHeaders, isAccountChanged } from "@/features/userData/client/accountHeader";
import type { ComposedDay } from "../model/compose";

/**
 * What the page gets back when it asks for today's plan. `offline`: the request never reached the server; `logged-out`:
 * a 401; `account-changed`: another account logged in since the page loaded; `failed`: anything else that went wrong.
 */
export type ComposeResult =
  | { ok: true; day: ComposedDay; date: string; attempt: number }
  | { ok: false; code: "no-answers" | "bad-date" | "no-blocks" | "taught" | "offline" | "logged-out" | "account-changed" | "failed" };

const TIMEOUT_MS = 15_000;
const CODES = new Set(["no-answers", "bad-date", "no-blocks", "taught"]);

const isDay = (d: unknown): d is ComposedDay => {
  const x = d as ComposedDay | null;
  return !!x && Array.isArray(x.exercises) && Array.isArray(x.steps) && typeof x.short === "boolean";
};

/**
 * Asks the server for today's plan (`POST /api/me/plan/compose`): `another` asks for another try of today's. Never throws;
 * 15 s timeout. Sends the page's account (`X-Account-Id`, `accountHeaders`). A 409 gives its code (`taught`: the
 * account is a teacher's student, whose plans are the teacher's); a 401 `logged-out`; a
 * 409 `account-changed` its own code; a fetch that throws (no network) gives `offline`; a timeout, a 500 or an answer of
 * another shape gives `failed`. The page words go by the code, never by the route's error text.
 */
export async function requestDay(body: { date: string; another: boolean }, fetcher: typeof fetch = fetch, /** the account id to send; left out, the page's own */ account?: string | null): Promise<ComposeResult> {
  let res: Response;
  try {
    res = await fetcher("/api/me/plan/compose", {
      method: "POST",
      // `undefined` takes the page's own account
      headers: accountHeaders({ "content-type": "application/json" }, account),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const name = (e as { name?: string } | null)?.name;
    return { ok: false, code: name === "TimeoutError" || name === "AbortError" ? "failed" : "offline" };
  }
  if (res.status === 401) return { ok: false, code: "logged-out" };
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, code: "failed" };
  }
  if (isAccountChanged(res.status, data)) return { ok: false, code: "account-changed" };
  const d = data as { ok?: unknown; day?: unknown; date?: unknown; attempt?: unknown; code?: unknown } | null;
  if (res.status === 409 && typeof d?.code === "string" && CODES.has(d.code)) return { ok: false, code: d.code as "no-answers" | "bad-date" | "no-blocks" | "taught" };
  if (res.ok && d?.ok === true && isDay(d.day) && typeof d.date === "string" && typeof d.attempt === "number") {
    return { ok: true, day: d.day, date: d.date, attempt: d.attempt };
  }
  return { ok: false, code: "failed" };
}
