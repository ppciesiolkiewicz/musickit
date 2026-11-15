# Account: rules

- **Ask through `useAccount()`.** A screen that splits by role calls `can("<feature>")`; it never compares roles
  itself, never reads the account keys in localStorage and never reads the cookies. A new split is one entry in
  `FEATURES` (`model.ts`).
- **The app needs a login; every role gets nearly all of it.** Which pages a visitor may open is one list,
  `src/lib/publicPaths.ts`, read by the proxy (`src/proxy.ts`), `ui/LoginGuard` and the nav. Nothing is gated when
  accounts are off. A teacher gets the same app as a student, plus sharing a plan as an invite (`sharePlan`: teachers and owners). With no
  account (`can(null, …)`, accounts off) everything is allowed, which is safe for `sharePlan` because there is no database to share from.
- **A signed-in person's data is on the server; device setup stays in the browser.** Plans, progress, notes, about me and
  videos belong to the account (`features/userData`, `features/videos`). Theme, audio devices, tool knobs and the other
  device keys stay in the browser. Old browser data was dropped with no import (2026-11-15), so don't write a carry-over.
  Without accounts (no database) the local source still keeps everything in the browser. Log out and Delete account
  reload the page, so no in-memory store can send under another account's cookie.
- **The rules of sign-in live in `server/auth.ts`, and stay pure.** No `Request`, no cookie and no SQL there: they take
  `AuthDeps` (the repo, the clock, the token maker). A route in `app/api/auth` reads the request, calls one of them and
  turns the result into cookies. A new rule gets a test in `server/auth.test.ts` over `repo.memory.ts`.
- **A new query is a method on `AuthRepo`**, written in both `repo.drizzle.ts` and `repo.memory.ts`.
- **Every route that changes something starts with `auth()` and `sameOrigin(req)`**, and finds the person with
  `requestAccount(deps, req)`. Never trust an id or an email from the request body for who is asking.
- **A plan is a database row.** Prices, allowances and `enabled` live in the `plans` table; the AI model is not per plan: every plan uses `SUBSCRIPTION_MODEL` (`plans.ts`); a screen shows
  what `GET /api/account/plan` gives and never writes a price of its own. The plan's role comes with it (`roleOnPlan`).
  `plans.new_plan_percent` (the chance an autoplan is written new rather than taken from the `practice_plans` library) is an
  internal cost lever that players never see: `listPlans` leaves it off `Plan`, which reaches the browser; only server code and /dev/costs read it.
- **A token is stored as its hash, used once, and never logged** (the one exception: the development log-in link).
- **Where to go next is checked with `safeNext`**, wherever it comes from. Never redirect to a raw `next`.
- **`server/` is server only.** Nothing in `ui/` or any client file imports from it; pages (server components) may.
- **This folder imports no feature.** Plan, progress, dev tools and the site nav import it.
- The words on these screens follow "Words about the app" in `teaching-voice`: Log in, Log out, Create account, the
  same on every screen.
