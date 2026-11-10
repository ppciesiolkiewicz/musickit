# Account: rules

- **Ask through `useAccount()`.** A screen that splits by role calls `can("<feature>")`; it never compares roles
  itself, never reads the account keys in localStorage and never reads the cookies. A new split is one entry in
  `FEATURES` (`model.ts`).
- **Nobody signed in can use everything.** `account: null` is every visitor. Don't make a page need an account.
- **A visitor's stored data never moves.** `accountKey(base)` is `base` for everybody but a development account
  (`/dev/account`), also for a person with a real session. Putting a real account's data somewhere else is the data
  move, and it has to carry the old data over.
- **Local data stores take their key from `accountKey`.** A store that should be per account wraps its key in it at
  each read and write (see `localPlanStore`, `localProgressStore`); logging in or out reloads the page, so nothing
  caches a key.
- **The rules of sign-in live in `server/auth.ts`, and stay pure.** No `Request`, no cookie and no SQL there: they take
  `AuthDeps` (the repo, the clock, the token maker). A route in `app/api/auth` reads the request, calls one of them and
  turns the result into cookies. A new rule gets a test in `server/auth.test.ts` over `repo.memory.ts`.
- **A new query is a method on `AuthRepo`**, written in both `repo.drizzle.ts` and `repo.memory.ts`.
- **Every route that changes something starts with `auth()` and `sameOrigin(req)`**, and finds the person with
  `requestAccount(deps, req)`. Never trust an id or an email from the request body for who is asking.
- **A token is stored as its hash, used once, and never logged** (the one exception: the development log-in link).
- **Where to go next is checked with `safeNext`**, wherever it comes from. Never redirect to a raw `next`.
- **`server/` is server only.** Nothing in `ui/` or any client file imports from it; pages (server components) may.
- **This folder imports no feature.** Plan, progress, dev tools and the site nav import it.
- The words on these screens follow "Words about the app" in `teaching-voice`: Log in, Log out, Create account, the
  same on every screen.
