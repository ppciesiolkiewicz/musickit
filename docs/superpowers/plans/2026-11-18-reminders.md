# Practice Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A player's daily practice reminder reaches them by email and by browser push with no attunr tab open, sent by a server run that an outside scheduler calls every 15 minutes; it is asked for (on by default) when an account is set up, joined or claimed, and changed any time on /plan.

**Architecture:** A new feature `src/features/reminders`: a pure model (settings, time zones, what is due), a repo (memory + drizzle, the `userData` pattern) over two new tables (`reminders`, `push_subscriptions`), and a service `runReminders` that the scheduler's route calls. It decides what to send with the plan feature's pure rules (moved out of `plan/reminders.ts` into `plan/model/reminder.ts`), sends email through `sendMail` and push through `web-push`. The reminder leaves the plan document: `PlanState.reminder`, `PracticeReminder` (the open-tab notification) and `plan/reminders.ts` are deleted. One client control, `ReminderControl`, is used on /plan, /account/setup, /join/<token> and /welcome.

**Tech Stack:** Next.js 16 (read `node_modules/next/dist/docs/` before writing a route, a page or `manifest.ts`), drizzle + Postgres, `node:test` via tsx, Resend through `sendMail`, `web-push` (VAPID), a service worker in `public/sw.js`, Tailwind.

**Spec:** `tasks.txt`, TaskSeries Reminders (Reminders1-4), with the user's decisions of 2026-11-18 marked `[2026-11-18, user]` there.

## Global Constraints

- The scheduler is the user's own, outside Vercel. It calls `POST /api/cron/reminders` (GET answers the same) with `Authorization: Bearer $CRON_SECRET`. No Vercel Cron, no `vercel.json`. Without `CRON_SECRET` set the route answers 503; a wrong or missing bearer, 401.
- A second call in the same 15 minutes, or two calls at once, never sends the same reminder twice (a sent-on date per channel, claimed atomically before sending).
- Reminder times are on the quarter hour only: `HH:00`, `HH:15`, `HH:30`, `HH:45`. Stored as local `HH:MM` plus an IANA time zone from the browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
- Due window: the zone's local time is at or past `time` and less than 60 minutes past it, on the same local date, and that channel hasn't sent on that date. A run missed for over an hour skips that day.
- The open-tab notification goes away: delete `PracticeReminder.tsx`, its mount in `PageShell`, `plan/reminders.ts`, `ReminderSettings`, and `PlanState.reminder`. Prelaunch: old reminder data in plan documents is dropped, no move-over (memory: prelaunch DB disposable).
- On by default when an account is set up (`/account/setup`), joined (`/join/<token>`) or claimed (`/claim` → `/welcome`): reminder on, 18:00, email ticked. Browser is ticked only by the player (asking the browser for permission needs their press).
- "Browser" is per device (a push subscription for that browser); "Email" is per account. The plan page's control shows both, always changeable.
- Every email reminder has an unsubscribe link and `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers. The link opens a page with one button (a mail scanner opening it changes nothing); the one-click POST switches email off with no login.
- No VAPID keys set → push is off: the Browser option is not shown, the run sends no push. No Resend key → `sendMail` answers "off", the run counts it and goes on (as today).
- Env: `CRON_SECRET`, `REMINDER_SECRET` (HMAC for unsubscribe tokens), `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:hello@attunr.app`). Add each to `.env.example` if the repo has one, and list them in the feature README.
- Every client fetch goes through `send()` (`src/features/account/ui/parts.tsx`, with a timeout) and shows an error inline or as a toast (memory: always surface errors).
- Interface copy: load `design:ux-copy` and "Words about the app" in `teaching-voice` before writing any string; report every string old → new. The words below are drafts for that pass.
- Install with short timeouts: `npm install web-push @types/web-push --no-audit --no-fund --fetch-timeout=20000 --fetch-retries=1 --fetch-retry-mintimeout=2000 --fetch-retry-maxtimeout=5000`.
- Commit on main with a temp index (memory: work on main, shared index staging): `GIT_INDEX_FILE=$TMP git read-tree HEAD`, add your paths, commit, then `git reset -q HEAD -- <paths>`. Never `git add` in the shared index.
- Before `db:migrate`, check where `.env.local`'s `DATABASE_URL` points; migrate only the local docker DB (`docker start musickit-db`), never production without asking.
- Add `src/features/reminders/*.test.ts src/features/reminders/server/*.test.ts` to the `test` script in `package.json`.

## Review Focus

1. **A teacher's student** (no questionnaire, `answers: null`): today's `reminderDue` returns false for anyone without answers, so a taught student never gets one. They must get one while a teacher week covers today and isn't finished. Test in Task 1.
2. **A zone across midnight and DST**: a player in `Pacific/Auckland` at 18:00 local is 05:00 UTC; on a DST change day the local time still decides. Test in Task 1 (`localNow` with fixed instants on both sides of a change).
3. **Two scheduler calls at once**: both see the reminder due; only one email goes out. Test in Task 4 (two `runReminders` in `Promise.all` over one memory repo, the drizzle claim is a conditional UPDATE … RETURNING).
4. **A dead push subscription** (the push service answers 404 or 410): it is deleted, the run goes on and the email still sends. Test in Task 4.
5. **A failed send** (Resend 500 after retries): the claim is undone, so the next run within the hour tries again; the run answers 200 with the failure counted, never throws. Test in Task 4.

---

### Task 1: The rules — what is due and what it says

**Files:**
- Create: `src/features/plan/model/reminder.ts`, `src/features/plan/model/reminder.test.ts` (port the cases from `src/features/plan/reminders.test.ts`, minus enabled/time/lastShownOn)
- Create: `src/features/reminders/model.ts`, `src/features/reminders/model.test.ts`

**Interfaces:**
- Produces (plan): `planWantsReminder(state: PlanState, today: string, taught: boolean): boolean` (the plan part of today's `reminderDue`: no time, no switch), `reminderBody(state: PlanState, today: string, taught: boolean): string` (same words as today; takes a date string, not a `Date`).
- Produces (reminders):
  ```ts
  export interface Reminder { enabled: boolean; time: string; zone: string; email: boolean; emailSentOn: string | null; pushSentOn: string | null }
  export type Channel = "email" | "push";
  export const DEFAULT_REMINDER: Omit<Reminder, "zone">; // { enabled: true, time: "18:00", email: true, emailSentOn: null, pushSentOn: null }
  export const OFF_REMINDER: Omit<Reminder, "zone">;     // the same with enabled: false (an account with no row)
  export const QUARTER_TIMES: string[];                  // "00:00" … "23:45", 96 entries
  export function cleanSettings(raw: unknown): { enabled: boolean; time: string; zone: string; email: boolean } | null;
  export function localNow(now: Date, zone: string): { date: string; hhmm: string };
  export function dueChannels(r: Reminder, now: Date, hasPush: boolean): Channel[];
  ```

- [ ] **Step 1: Write the failing tests**

`plan/model/reminder.test.ts`:
- `planWantsReminder: no answers, not taught → false`; `answers, no plan made today → true`; `today's own plan finished → false`; `today's own plan half done → true`.
- `planWantsReminder: taught, no answers, teacher week covers today, day not finished → true` (Review Focus 1); `taught, no week covers today → false`; `taught, today's day finished → false`.
- `reminderBody`: the three existing wordings, unchanged (copy the expected strings from `reminders.test.ts`).

`reminders/model.test.ts`:
- `cleanSettings` accepts `{ enabled: true, time: "07:45", zone: "Europe/Warsaw", email: true }`; returns null for `time: "07:40"`, `"7:45"`, `"24:00"`, `zone: "Mars/Base"`, `zone: ""`, a missing `email`.
- `localNow(new Date("2026-11-18T05:00:00Z"), "Pacific/Auckland")` → `{ date: "2026-11-18", hhmm: "18:00" }`; `localNow(new Date("2026-11-18T23:30:00Z"), "Europe/Warsaw")` → `{ date: "2026-11-19", hhmm: "00:30" }`.
- DST (Review Focus 2): `localNow(new Date("2026-03-29T00:30:00Z"), "Europe/Warsaw").hhmm === "01:30"` and `localNow(new Date("2026-03-29T01:30:00Z"), "Europe/Warsaw").hhmm === "03:30"`.
- `dueChannels`, time "18:00", zone "UTC", email on: at 17:59 → `[]`; 18:00 → `["email"]`; 18:59 → `["email"]`; 19:00 → `[]`; with `emailSentOn` = today → `[]`; with `emailSentOn` = yesterday → `["email"]`; `hasPush` true and `pushSentOn` null → includes `"push"`; `enabled: false` → `[]`; `email: false, hasPush: false` → `[]`.
- `dueChannels` time "23:45", now 00:10 next day → `[]` (the window doesn't run past midnight).

- [ ] **Step 2: Run to see them fail**

Run: `npx tsx --test src/features/plan/model/reminder.test.ts src/features/reminders/model.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement both files**

`localNow`: `Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now)`. Zone validity in `cleanSettings`: constructing `Intl.DateTimeFormat` with it doesn't throw. `dueChannels` compares minutes since midnight: `time ≤ now < time + 60`, capped at 24:00.

- [ ] **Step 4: Run to see them pass**

Same command. Expected: PASS.

- [ ] **Step 5: Commit** `feat(reminders): due rules in the zone's own time; a taught student is reminded too`

---

### Task 2: Tables and repo

**Files:**
- Modify: `src/lib/db/schema.ts` (two tables after `userVoices`)
- Create: migration via `npm run db:generate` (next is `drizzle/0034_*.sql`)
- Create: `src/features/reminders/server/repo.ts`, `repo.memory.ts`, `repo.drizzle.ts`, `repo.test.ts` (runs over the memory repo)

**Interfaces:**
- Consumes: `Reminder`, `Channel` (Task 1).
- Produces:
  ```ts
  export interface PushSub { endpoint: string; p256dh: string; auth: string }
  export interface ReminderRepo {
    get(userId: string): Promise<Reminder | null>;
    /** Saves the settings; a changed time clears both sent-on dates (a new time today can still remind). */
    put(userId: string, s: { enabled: boolean; time: string; zone: string; email: boolean }, now: Date): Promise<Reminder>;
    setEmail(userId: string, email: boolean, now: Date): Promise<boolean>;
    listEnabled(): Promise<Array<Reminder & { userId: string }>>;
    /** True when this call set `<channel>SentOn` to `date` (it was null or another date); false when it already was `date`. */
    claim(userId: string, channel: Channel, date: string): Promise<boolean>;
    /** Puts `<channel>SentOn` back to `previous` after a failed send. */
    unclaim(userId: string, channel: Channel, previous: string | null): Promise<void>;
    addPush(userId: string, sub: PushSub, now: Date): Promise<void>; // upsert on endpoint (a device moving accounts moves its row)
    removePush(endpoint: string): Promise<void>;
    listPush(userId: string): Promise<PushSub[]>;
  }
  ```
- Tables: `reminders` (`user_id` uuid pk → users cascade, `enabled` bool, `time` text, `zone` text, `email` bool, `email_sent_on` date null, `push_sent_on` date null, `updated_at`), check `time ~ '^([01][0-9]|2[0-3]):(00|15|30|45)$'`; `push_subscriptions` (`endpoint` text pk, `user_id` uuid → users cascade, indexed, `p256dh` text, `auth` text, `created_at`).

- [ ] **Step 1: Write the failing tests** (`repo.test.ts`, memory repo): `get` of an unknown user → null; `put` then `get` round-trips; `put` with a new time clears `emailSentOn`, the same time keeps it; `claim` twice for the same date → `true` then `false`; `claim` after `unclaim(…, null)` → `true`; `claim` for another date after one → `true`; `listEnabled` leaves out `enabled: false`; `addPush` the same endpoint for a second user → `listPush(first)` is empty; `removePush` → gone.
- [ ] **Step 2: Run, expect FAIL.** `npx tsx --test src/features/reminders/server/repo.test.ts`
- [ ] **Step 3: Implement** the schema, `npm run db:generate`, the memory repo, the drizzle repo. Drizzle `claim`: `update reminders set <col> = $date where user_id = $id and (<col> is null or <col> <> $date) returning user_id` → `rows.length === 1` (Review Focus 3).
- [ ] **Step 4: Run, expect PASS.** Then check `.env.local`, `docker start musickit-db`, `npm run db:migrate`, and `npm run test:library-db` still passes.
- [ ] **Step 5: Commit** `feat(db): reminders and push_subscriptions tables`, including the migration and `drizzle/meta`. Run `npm run db:diagram` and offer the user to update the DB schema artifact.

---

### Task 3: Unsubscribe token and the reminder email

**Files:**
- Create: `src/features/reminders/server/token.ts`, `token.test.ts`
- Create: `src/features/reminders/server/mail.ts`, `mail.test.ts`
- Modify: `src/features/account/server/mail.ts:39` (`sendMail` takes an optional `headers?: Record<string, string>`, passed through to Resend's body)

**Interfaces:**
- Produces:
  ```ts
  export function offToken(userId: string, secret: string): string;        // `${userId}.${base64url(hmacSha256(secret, "reminder-off:" + userId))}`
  export function readOffToken(token: string, secret: string): string | null; // the userId, or null (timingSafeEqual)
  export const offPageUrl = (base: string, token: string) => `${base}/reminders/off?token=${encodeURIComponent(token)}`;
  export const offPostUrl = (base: string, token: string) => `${base}/api/reminders/off?token=${encodeURIComponent(token)}`;
  export function reminderEmail(to: string, body: string, base: string, token: string, env: Env): { from; to; subject; text; html; headers };
  ```

- [ ] **Step 1: Write the failing tests:** `readOffToken(offToken("u1", "s"), "s") === "u1"`; a token with one character of the mac changed → null; signed with another secret → null; `"garbage"` → null. `reminderEmail`: `subject === "Time to practise"`; `text` contains the body, `${base}/plan` and `offPageUrl(...)`; `headers["List-Unsubscribe"] === "<" + offPostUrl(...) + ">"`; `headers["List-Unsubscribe-Post"] === "List-Unsubscribe=One-Click"`; the html escapes a body with `<b>`.
- [ ] **Step 2: Run, expect FAIL.** `npx tsx --test src/features/reminders/server/token.test.ts src/features/reminders/server/mail.test.ts`
- [ ] **Step 3: Implement.** The HTML is the log-in email's layout (`linkHtml` in `account/server/mail.ts`: card, colour dots, logo, one button "Open today's plan" to `/plan`), with a small line under the card linking to the off page ("Stop these emails"). Lift the shared palette and frame from `account/server/mail.ts` into an exported helper there instead of copying it a third time. Load the copy skills before the words.
- [ ] **Step 4: Run, expect PASS.** Also `npx tsx --test src/features/account/server/mail.test.ts`.
- [ ] **Step 5: Commit** `feat(reminders): reminder email with one-click unsubscribe`

---

### Task 4: The run

**Files:**
- Create: `src/features/reminders/server/run.ts`, `run.test.ts`

**Interfaces:**
- Consumes: Tasks 1-3; `readDoc(repo, userId, "plan")` (`userData/server/data.ts`) and `sanitiseState` (`plan/model/state.ts`).
- Produces:
  ```ts
  export type PushResult = "sent" | "gone" | "failed";
  export interface RunDeps {
    repo: ReminderRepo;
    planOf(userId: string): Promise<PlanState>;                         // sanitised; EMPTY_STATE when none
    accountOf(userId: string): Promise<{ email: string; taught: boolean } | null>;
    mail(m: ReturnType<typeof reminderEmail>): Promise<"sent" | "off">; // throws on failure, as sendMail does
    push: ((sub: PushSub, payload: { title: string; body: string; url: string }) => Promise<PushResult>) | null; // null: no VAPID
    base: string; offSecret: string;
  }
  export async function runReminders(deps: RunDeps, now: Date): Promise<{ due: number; emailed: number; pushed: number; skipped: number; failed: number }>;
  ```
- Per enabled reminder: `localNow` → `dueChannels(r, now, subs.length > 0 && !!deps.push)`; nothing due → next. Else read the account (gone → skip) and the plan; `planWantsReminder` false → `skipped`, nothing claimed. For each channel: `claim` (false → skip it), send, and on a throw `unclaim` back to the earlier value and count `failed`. Push: send to each of the user's subscriptions; `"gone"` → `removePush`; the channel counts as sent if any one sent. One user's failure never stops the others.

- [ ] **Step 1: Write the failing tests** over the memory repo with fake `mail`/`push`, `now` fixed at `2026-11-18T18:05:00Z`, zone `UTC`:
  - `sends one email to a due player` → `mail` called once with `to: [email]`, `emailed: 1`.
  - `two runs at once send one email` (`Promise.all`, Review Focus 3).
  - `a second run in the same hour sends nothing`.
  - `today's plan finished → skipped, nothing claimed` (a later run after un-finishing it still sends).
  - `taught student with today's teacher day open → sent` (Review Focus 1, end to end).
  - `mail throws → failed: 1, emailSentOn back to null, the next run sends` (Review Focus 5).
  - `push "gone" → subscription removed, email still sent` (Review Focus 4).
  - `push null (no VAPID) → no push, email sent`.
  - `deleted account → skipped, no throw`.
- [ ] **Step 2: Run, expect FAIL.** `npx tsx --test src/features/reminders/server/run.test.ts`
- [ ] **Step 3: Implement** `runReminders`. Users one after another (prelaunch scale; note in the README that past a few thousand enabled rows it wants a `next_due_at` column).
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(reminders): the run that sends what is due, once`

---

### Task 5: Routes and the off page

**Files:**
- Create: `src/features/reminders/server/http.ts`, `http.test.ts` (handlers take deps, like `students/server/http.ts`)
- Create: `src/app/api/cron/reminders/route.ts`, `src/app/api/me/reminder/route.ts`, `src/app/api/me/reminder/push/route.ts`, `src/app/api/reminders/off/route.ts`
- Create: `src/app/reminders/off/page.tsx`, `src/features/reminders/ui/ReminderOff.tsx` (one button, like `ClaimLink`)
- Modify: `src/lib/publicPaths.ts` (`/reminders/off` in `MARKETING`-like public list) and its test

**Interfaces:**
- Consumes: Tasks 2-4, `signedIn` (`userData/server/http.ts`), `json`, `readJson` (`account/server/http.ts`).
- Produces (HTTP):
  - `POST|GET /api/cron/reminders` → 503 no `CRON_SECRET`; 401 bad bearer; 200 `{ due, emailed, pushed, skipped, failed }`. `export const runtime = "nodejs"; export const dynamic = "force-dynamic"; export const maxDuration = 60`.
  - `GET /api/me/reminder` → `{ reminder: { enabled, time, zone, email } | null, push: boolean }` (`push`: VAPID set). `PUT` same shape → 400 on `cleanSettings` null, 200 the saved settings.
  - `POST /api/me/reminder/push` `{ endpoint, keys: { p256dh, auth } }` → 204; `DELETE` `{ endpoint }` → 204. Endpoint must be `https:`, at most 1000 characters.
  - `POST /api/reminders/off?token=` (body ignored: one-click sends `List-Unsubscribe=One-Click` form data) → 200 `{ ok: true }`, 400 bad token. No login, no Origin check (mail programs post it).

- [ ] **Step 1: Write the failing tests** (`http.test.ts`, deps over memory repos): cron without the secret env → 503; with `Bearer wrong` → 401; with the right bearer → 200 and the counts; `PUT` time `"18:10"` → 400; `PUT` good → 200 and `GET` returns it; a signed-out `GET` → 401; off with a good token → email false, enabled stays true; off with a bad token → 400; push `POST` with `http:` endpoint → 400. `publicPaths` test: `/reminders/off` is public.
- [ ] **Step 2: Run, expect FAIL.** `npx tsx --test src/features/reminders/server/http.test.ts src/lib/publicPaths.test.ts`
- [ ] **Step 3: Implement** the handlers, the thin routes (read the route-handler guide in `node_modules/next/dist/docs/` first), the off page ("Stop reminder emails" button → "Reminder emails are off. You can turn them on again on the Practice plan page." with a link; copy through the skills). The bearer compare uses `timingSafeEqual` over equal-length buffers.
- [ ] **Step 4: Run, expect PASS.** Then on the dev server: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/reminders` → 200 JSON.
- [ ] **Step 5: Commit** `feat(reminders): scheduler route, settings API, unsubscribe page`

---

### Task 6: Browser push

**Files:**
- Modify: `package.json` (`web-push`, `@types/web-push`; a script `"vapid": "web-push generate-vapid-keys"`)
- Create: `src/features/reminders/server/push.ts` (`webPushSender(env): RunDeps["push"]`)
- Create: `public/sw.js`
- Create: `src/features/reminders/client.ts` (fetch helpers + push subscribe)
- Create: `src/app/manifest.ts` (read the metadata-files guide in `node_modules/next/dist/docs/` first)
- Modify: `src/app/api/cron/reminders/route.ts` (pass `webPushSender(process.env)`)

**Interfaces:**
- Produces:
  ```ts
  export function webPushSender(env: Env): ((sub: PushSub, p: { title: string; body: string; url: string }) => Promise<PushResult>) | null; // null without all three VAPID vars; 404/410 → "gone"; other errors → "failed"; 8 s timeout
  export const pushSupported: () => boolean;                    // serviceWorker + PushManager + Notification in window
  export async function subscribeHere(publicKey: string): Promise<PushSub | null>; // asks permission, registers /sw.js, subscribes (userVisibleOnly, applicationServerKey); null when refused
  export async function unsubscribeHere(): Promise<string | null>; // the endpoint it dropped
  export async function hereSubscribed(): Promise<boolean>;
  export const loadReminder, saveReminder, savePush, dropPush; // over send(), one per route of Task 5
  ```
- `public/sw.js`: `push` → `showNotification(title, { body, tag: "attunr-plan", icon: "/icon.png", data: { url } })`; `notificationclick` → focus an open attunr window on `url` or `clients.openWindow(url)`.
- `manifest.ts`: name, short name, `start_url: "/plan"`, `display: "standalone"`, the app's dark background, icons from `public/` (check which sizes exist; the brand set is from `npm run brand`).

- [ ] **Step 1: Write the failing test** `push.test.ts`: `webPushSender({})` → null; with keys and a stubbed `sendNotification` that rejects `{ statusCode: 410 }` → `"gone"`; `{ statusCode: 500 }` → `"failed"`; resolves → `"sent"`. (Inject `sendNotification` as a second parameter for the test.)
- [ ] **Step 2: Run, expect FAIL.** `npx tsx --test src/features/reminders/server/push.test.ts`
- [ ] **Step 3: Install and implement.** Generate keys with `npm run vapid`, put them in `.env.local`, tell the user to add them in Vercel (they are not committed).
- [ ] **Step 4: Run, expect PASS.** In Chrome on the dev server: subscribe through a scratch call to `subscribeHere`, run the cron curl at a due time, see the notification with every attunr tab closed (keep the user's localStorage, memory: browser tests).
- [ ] **Step 5: Commit** `feat(reminders): browser push with no tab open; web app manifest`

---

### Task 7: The control on /plan, and the old reminder out

**Files:**
- Create: `src/features/reminders/ui/ReminderControl.tsx`, `src/features/reminders/ui/useReminder.ts`, `src/features/reminders/index.ts`
- Modify: `src/features/plan/PlanApp.tsx:238-275` (the `Reminder` component goes; `ReminderControl variant="bar"` in its place)
- Delete: `src/features/plan/PracticeReminder.tsx`, `src/features/plan/reminders.ts`, `src/features/plan/reminders.test.ts`
- Modify: `src/components/PageShell.tsx` (drop the mount), `src/features/plan/index.ts`, `src/features/plan/model/types.ts` (drop `ReminderSettings`, `reminder`, from `EMPTY_STATE`), `src/features/plan/model/state.ts` (drop the reminder from `sanitiseState`), `src/features/plan/store/usePlan.tsx` (the `usePlanStore` comment), and the tests that build a `reminder`: `userData/server/data.test.ts`, `userData/server/shares.test.ts`, `students/server/plans.test.ts`, `plan/store/serverPlanStore.test.ts`, `devtools/model/kickstarterStudents.ts` and its test

**Interfaces:**
- Consumes: `client.ts` (Task 6), `QUARTER_TIMES`, `DEFAULT_REMINDER` (Task 1).
- Produces:
  ```ts
  export type ReminderDraft = { enabled: boolean; time: string; email: boolean; browser: boolean };
  /** Loads and saves the account's reminder; puts the browser's zone in on every save, and saves once on load when the stored zone differs. */
  export function useReminder(): { draft: ReminderDraft | null; pushOffered: boolean; error: string | null; change(d: Partial<ReminderDraft>): Promise<void> };
  /** "bar": /plan's header row (switch + time + a Dropdown with the two ways). "form": a fieldset for setup, join and welcome, controlled by its form. */
  export default function ReminderControl(props: { variant: "bar" } | { variant: "form"; value: ReminderDraft; onChange(d: ReminderDraft): void; pushOffered: boolean });
  ```
- The time is a `Select` (`components/ui/atoms`) of `QUARTER_TIMES`, not `<input type=time>` (its `step` is a hint browsers ignore). Ticking Browser calls `subscribeHere` then `savePush`; refused → it stays unticked and says notifications are blocked (the line the current control has). Unticking calls `unsubscribeHere` then `dropPush`. On an iPhone not in standalone mode, Browser is replaced by one line: add attunr to the Home Screen first. Draft words, for the copy pass: "Remind me at", "By email", "In this browser".
- Keep the 320 px rule of today's control: one line, the bell hides under 340 px.

- [ ] **Step 1: Write the failing test** `plan/model/state.test` case (or the nearest existing file): `sanitiseState({ ...doc, reminder: { enabled: true, time: "18:00" } })` has no `reminder` key. And `ReminderControl.test.tsx` (pattern: `students/ui/ClaimLink.test.tsx`): the form variant shows 96 times, ticks reflect `value`, picking "07:15" calls `onChange` with `time: "07:15"`; with `pushOffered: false` there is no Browser box.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement**, delete the old files, fix every test that built a `reminder` (`grep -rn "reminder" src` shows none left outside `features/reminders`, `plan/model/reminder.ts`, intro and landing copy).
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit 2>&1 | grep -v '^.next/'`. Expected: all pass, no type errors. On the dev server signed in (memory: signed-in walk on 127.0.0.1:3107, local DB): /plan at 320, 390 and 1280 px, dark and Surf Rock; switch on, change the time, tick and untick both ways; reload and see it kept; stop the DB and see the error shown.
- [ ] **Step 5: Commit** `feat(plan): reminder by email and push on /plan; the open-tab notification goes`

---

### Task 8: On by default at setup, join and claim

**Files:**
- Modify: `src/features/account/ui/SetupForm.tsx` (a "Daily reminder" fieldset after the name, `ReminderControl variant="form"`), `src/app/api/account/setup/route.ts`
- Modify: `src/features/account/ui/JoinForm.tsx`, `src/app/api/join/[token]/route.ts` (only for a new account, as with `acceptTerms`)
- Modify: `src/features/students/ui/Welcome.tsx` (the fieldset, saved on change, under the welcome line)
- Modify: `src/app/api/auth/claim/route.ts` and `src/features/students/client.ts` (`postClaim` sends `{ zone }`)
- Create: `src/features/reminders/server/defaults.ts`, `defaults.test.ts`

**Interfaces:**
- Consumes: `ReminderRepo` (Task 2), `cleanSettings`, `DEFAULT_REMINDER` (Task 1), `ReminderControl` (Task 7).
- Produces: `startReminder(repo: ReminderRepo, userId: string, raw: unknown, now: Date): Promise<void>`: `raw` cleaned and saved; missing or broken → `DEFAULT_REMINDER` with the zone given, or `"UTC"` when that is bad too. Never throws on bad input; never overwrites a row that exists (an account setting up again keeps its choice).
- Setup and join bodies take `reminder: { enabled, time, zone, email }`; the claim body takes `{ zone }` and the claim makes the default row. Browser, if ticked on the form, subscribes from the page after the account is saved (it needs the session).

- [ ] **Step 1: Write the failing tests** (`defaults.test.ts`): no row + `{ enabled: false, time: "07:00", zone: "UTC", email: true }` → saved as given; no row + `undefined` + zone → `DEFAULT_REMINDER` with it; zone `"nope"` → `"UTC"`; a row exists → unchanged. Plus in the setup and join route tests: a body with `reminder` stores it; a body without stores the default.
- [ ] **Step 2: Run, expect FAIL.** `npx tsx --test src/features/reminders/server/defaults.test.ts src/features/account/server/http.test.ts`
- [ ] **Step 3: Implement.** The fieldset starts on, 18:00, By email ticked, In this browser unticked. Copy through the skills; the draft legend is "Daily reminder" with one line under it: the email comes at that time while today's plan isn't done, and it can be changed on the Practice plan page.
- [ ] **Step 4: Run** the tests, tsc, eslint on the changed files. In the browser with a brand-new account: /account/setup at 390 and 1280 px, submit, see /plan's control on at 18:00 with email ticked. A claim link for a new student (`db:seed-fake` or /students → Add student), then /welcome, same check. A join link, same.
- [ ] **Step 5: Commit** `feat(account): ask for the daily reminder at setup, join and claim; on by default`

---

### Task 9: Docs, tasks and the scheduler handoff

**Files:**
- Create: `src/features/reminders/README.md` (what it is, the run, the env vars, the scheduler call, the scale note), `src/features/reminders/CLAUDE.md` (rules: settings only through `ReminderRepo`; the run never throws; a send is claimed before it goes; copy through the skills)
- Modify: `src/features/plan/README.md` (section 8 and the file list: the reminder is the reminders feature's), `src/features/plan/CLAUDE.md:13` (drop the `PracticeReminder` mention), `src/features/devtools/README.md` (the reminder line), `src/features/account/README.md` (setup and join ask for a reminder)
- Modify: `tasks.txt` (dated `[done]` notes under Reminders1-4; `[DONE]` on each first line and move them below the DONE line once seen working)
- Check: `src/components/landing/home/AutoplanHome.tsx:38,114` and `src/features/intro/scenes.tsx:229` still say true things ("A daily reminder at the time you choose"); if a word changes, through the copy skills and report it.

- [ ] **Step 1:** Write the docs. In the README, the call for the user's scheduler:
  ```
  every 15 minutes (at :00, :15, :30, :45):
  curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/reminders
  ```
- [ ] **Step 2:** `npm test`, `npx tsc --noEmit 2>&1 | grep -v '^.next/'`, `npx eslint` on every changed file. Expected: clean.
- [ ] **Step 3: Commit** `docs(reminders): feature docs, plan docs, tasks`
- [ ] **Step 4: Report to the user:** the env vars to set in Vercel (`CRON_SECRET`, `REMINDER_SECRET`, the three VAPID ones), the curl for their scheduler, the migration to run on production (ask first), every string old → new, and what was and wasn't seen in the browser (iPhone Home Screen push needs a real phone).
