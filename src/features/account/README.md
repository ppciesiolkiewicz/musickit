# Account

Who is using the app, and what their role lets them use: students, teachers and owners. People log in with a link or a
6-digit code we email them, or with Google. There are no passwords and no separate register form: `/login` is the one way in, and a
person with no account yet gets one straight away, named from Google or from the email (the part before the @). The
name is changed on `/account`.

## Parts

- `model.ts`: `Role` (student, teacher, owner; an owner runs a school and can do all a teacher can), `NEW_ACCOUNT_ROLE`
  (student: every account a person makes for themself starts as one; a teacher or owner is made one by us), `Account` (id, name, email, role), `FEATURES` (the parts
  of the app with the roles that may use them; every role gets every feature except `sharePlan`, for teachers and owners), `can(account, feature)` and
  `homePage(account)` (the home page the profile menu's Home page goes to: / for a teacher or owner, /players for a student).
- `plans.ts`: `Plan` (a row of the `plans` table: name, the role it gives, price in US cents a month or a year, students,
  AI autoplans a month, Batch, `enabled`, `sort`; every plan's autoplans and notes are written by one model, `SUBSCRIPTION_MODEL`, Haiku 5.5), `choosablePlans`
  (the enabled plans, plus the one the person is on even when turned off), `canChoose`, `roleOnPlan` and the labels.
  The plans themselves are rows in the database, written by migration `0005_plans` and changed there; their prices and
  allowances come from *Plans* on /dev/costs, which shows what each costs us. Each row also has `new_plan_percent`, internal
  and kept off `Plan`: the chance (0 to 100) that an autoplan on it is written new by the AI; the rest are taken from the
  `practice_plans` library (rows `enabled_for_reuse`). Always 1 to 99, held by a check in the database: no plan only
  reuses and none always writes. Migration `0009_new_plan_percent_range` sets Student 10, Teacher Basic 25, Pro 50, Unlimited 75. Nothing takes a plan from the library yet: the app doesn't call the AI from the server.
- `ui/PlanPicker.tsx`: the Plan part of `/account`. `GET /api/account/plan` gives `{ plans, current }`; `POST` with
  `{ planId }` moves the person at once, with no payment during the beta (`choosePlan` in `server/auth.ts`), and the page
  reloads. Leaving a Teacher plan for Student asks first.
- `loginGuard.ts` also has `loginWords(next)`: the login page's heading and line, "Create your account or log in to view" when `next` is a plan invite (`/plan/invite/…`), else the usual.
- `loginGuard.ts` + `ui/LoginGuard.tsx`: the client half of the login wall (mounted in the root layout). The server half
  is `src/proxy.ts`, which only checks that the session cookie is there (and, for a shared note's page load, asks the share's
  public API through `src/lib/sharedNoteGone.ts`, so a stopped link is answered with 404 before the page streams: a clear 404
  only, 2 s at most, failing open); both read the public paths from
  `src/lib/publicPaths.ts` (public: the marketing pages, the demos, logging in, and a shared note at `/notes/shared/<id>`).
  The guard catches a stale cookie, and keeps a gated page's URL hash (which the server never sees, such as
  `/dev/stories#<story>`) across logging in.
- `AccountStore.ts`: `current()` and `signOut()`, all a page needs.
- `serverAccountStore.ts`: the real store, over `/api/auth`. `accountsOpen()` says whether the site has accounts at all. The session is read once per page (`sessionReader`), shared by every `useAccount()`; with the hint cookie, only a 200 answers it (`{ account: null }` is signed out), and a network error or any other answer is asked again after 2, 5, 15, 30 s (`readSession`), the page waiting meanwhile. `pageAccountId()` is the id the page loaded for; `accountHeaders(extra)` adds it as `X-Account-Id` to every request that changes the account or its data (the data clients take it through `userData/client/accountHeader.ts`, since this folder imports no feature), and `isAccountChanged(status, body)` / `ACCOUNT_CHANGED_WORDS` read the server's 409 `account-changed` ("Another account is logged in now. Reload the page, then try again.").
- `useAccount.tsx`: `useAccount()` gives `{ account, loaded, can }`. It asks the real session (the page's one shared read), and nothing at all when
  there is no session cookie.
- `ui/`: the screens. `LinkForm` (`/login`), `ConfirmLink` (`/login/confirm`), `AccountPanel`
  (`/account`: the name, Log out, Delete account), `AccountLink` (the corner of the top nav: Log in, or the name with a
  menu of Your profile and Log out, opened on hover or a tap).
- `server/`: sign-in itself, server only.
  - `auth.ts`: the rules, with no HTTP and no SQL in them: `requestEmailLink`, `openEmailLink`, `openEmailCode`, `googleSignIn`,
    `startName`, `sessionAccount`, `peekSession` (the same without renewing, for a server page), `signOut`, `rename`.
  - `repo.ts`: what those rules need from storage. `repo.drizzle.ts` is Postgres, `repo.memory.ts` is for tests.
  - `http.ts`: cookies, the same-site check, `auth()` (null when there is no database), `requestAccount(req)`.
  - `google.ts`: the Google code flow with PKCE. `mail.ts`: the email with the link and the code, sent through Resend.

The tables are in `src/lib/db/schema.ts` and the migrations in `/drizzle`.

## The flows

| | |
| --- | --- |
| Email | `/login`: email → `POST /api/auth/email-link` mails a link and a code → either `/login/confirm?token=`, whose script calls `POST /api/auth/email-link/confirm`, or the code typed on `/login` → `POST /api/auth/email-code`. An email with an account is signed in; one without gets an account named from the email, and is signed in. |
| Google | `GET /api/auth/google/start` → Google → `GET /api/auth/google/callback`. A known Google id, or a Google-verified email that has an account, logs in. A new person gets an account with Google's name, and is signed in. |
| Session | `GET /api/auth/session` → `{ account }`. `POST /api/auth/logout`. |
| Account | `PATCH /api/account` (name), `DELETE /api/account`. Both go through `signedIn` (`userData/server/http.ts`), so a page open for another account than the session's gets 409 `account-changed` and never renames or deletes the account logged in now; `send()` in `ui/parts.tsx` sends `X-Account-Id`, and `errorOf` shows the reload line. |

Things that are on purpose:

- **The mailed link does nothing alone.** It opens a page whose script spends the token, with no button to press. Mail
  programs fetch links to scan them; a plain fetch runs no script, so it can't use the link up. (A scanner that runs
  the page's script would; then the person asks for a new link or types the code.)
- **Nobody is asked for a name at sign-in.** A new account starts with Google's name or the email before the @, and
  is renamed on `/account`. The old `/account/setup` goes to `/account` (`next.config.ts`).
- **Only hashes are stored.** The session cookie and every link carry a random token; the database holds its SHA-256.
  A code is stored as the SHA-256 of the email and the code.
- **The link and the code are one proof.** They are the same row: using one spends the other. The code works on the
  page that asked for it, so it logs in there even when the email was read on a phone.
- **A code takes 5 tries**, right or wrong, counted before it is compared, so guesses sent at once can't pass the
  limit. With 10 emails a day, that is 50 guesses a day at a million codes.
- **Two cookies.** `mk_session` (hidden from scripts) is the session. `mk_in` only tells the page that a session
  exists, so a visitor's page never asks the server who they are. The server never trusts `mk_in`.
- **The answer to "email me a link" never says whether the email has an account.**
- **A role comes with a plan.** A new account is a student on the Student plan. Choosing a Teacher plan on `/account` makes a student a teacher, and choosing Student makes a teacher a student again; an owner is set by us and stays an owner on any plan. A plan turned off (`enabled = false`) can't be chosen, but whoever is on it keeps it. Logging in again, by link or
  Google, never changes the name or role of an account.
- **The old addresses still work.** `/register` and `/register/teacher` go to `/login`, `/register/finish` to
  `/login` (`next.config.ts`).
- **Emails are limited**: one to an address a minute (`RESEND_WAIT`; the log-in page counts it down on "Send a new email"), 3 in 15 minutes, 10 in a day. A link and its code live 1 hour, a session a
  year from its last use, so a person who comes back now and then is never logged out.

## Setting it up

Local, once:

```
npm run db:up        # Postgres in Docker, port 5433
npm run db:migrate   # make the tables
```

and `DATABASE_URL=postgres://musickit:musickit@localhost:5433/musickit` in `.env.local`. Without `RESEND_API_KEY`,
development mails nothing: the link is shown on the page and printed in the server log. When Resend refuses the mail
(or can't be reached), development shows the link the same way with Resend's reason, and every environment logs the
reason (`[auth] the log-in email ... was not sent`). Each try at Resend gives up after 8 s and a timeout, a lost connection, a 429 or a 5xx is tried once more with the same `Idempotency-Key` (`MAIL_TIMEOUT`, `MAIL_TRIES`), so one email is never sent twice. The page itself gives up on any account request after 30 s (`SEND_TIMEOUT` in `ui/parts.tsx`) and shows the error under the form. An `AUTH_URL` that isn't an http(s) address is ignored. `.env.example` lists the rest
(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_URL`, `AUTH_FROM_EMAIL`).

`npm run db:wipe` deletes every row in a local database: accounts, sessions and saved data. The tables and the
migration record stay. It refuses a database that isn't on localhost unless you pass `-- --yes-really`.

A changed table: edit `src/lib/db/schema.ts`, then `npm run db:generate` and `npm run db:migrate`. Commit the new file
in `/drizzle`. Production: set `DATABASE_URL` (and run `db:migrate` against it) before the deploy; the site reads at
build time whether it has accounts.

## Without a database

No `DATABASE_URL` means no accounts: the nav shows no Log in, `/login` says accounts aren't open, and the routes answer
503. `useAccount()` gives `account: null`, the local person, who can use everything. This is how the site ran before.

## Not here yet

- The plan page's Share plan asks `can("sharePlan")` (Share, or Upgrade to Teacher account), and the share rules (`userData/server/shares.ts`) ask `can(account, "sharePlan")` again on the server.
- Plans aren't paid for yet, and their allowances (autoplans a month, students) aren't counted or enforced: the app doesn't call the AI from the server.
- Which students a teacher has, schools, and giving a plan to a student are not modelled.
- Links are limited per email only, not per network address.
