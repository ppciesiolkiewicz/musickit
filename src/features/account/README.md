# Account

Who is using the app, and what their role lets them use: students, teachers and owners. People log in with a link we
email them or with Google. There are no passwords and no separate register form: `/login` is the one way in, and a
person with no account yet goes on to the account setup, which asks only for the name.

## Parts

- `model.ts`: `Role` (student, teacher, owner; an owner runs a school and can do all a teacher can), `NEW_ACCOUNT_ROLE`
  (student: every account a person makes for themself starts as one; a teacher or owner is made one by us), `Account` (id, name, email, role), `FEATURES` (the parts
  of the app that belong to some roles: the notes creator and AI plans are for teachers and owners) and
  `can(account, feature)`.
- `AccountStore.ts`: `current()` and `signOut()`, all a page needs.
- `serverAccountStore.ts`: the real store, over `/api/auth`. `accountsOpen()` says whether the site has accounts at all.
- `useAccount.tsx`: `useAccount()` gives `{ account, loaded, can }`. It asks the real session, and nothing at all when
  there is no session cookie.
- `ui/`: the screens. `LinkForm` (`/login`), `ConfirmLink` (`/login/confirm`), `FinishSignup`
  (`/account/setup`), `AccountPanel` (`/account`), `AccountLink` (the corner of the top nav).
- `server/`: sign-in itself, server only.
  - `auth.ts`: the rules, with no HTTP and no SQL in them: `requestEmailLink`, `openEmailLink`, `googleSignIn`,
    `pendingSignup`, `finishSignup`, `sessionAccount`, `signOut`, `rename`.
  - `repo.ts`: what those rules need from storage. `repo.drizzle.ts` is Postgres, `repo.memory.ts` is for tests.
  - `http.ts`: cookies, the same-site check, `auth()` (null when there is no database), `requestAccount(req)`.
  - `google.ts`: the Google code flow with PKCE. `mail.ts`: the email with the link, sent through Resend.

The tables are in `src/lib/db/schema.ts` and the migrations in `/drizzle`.

## The flows

| | |
| --- | --- |
| Email | `/login`: email → `POST /api/auth/email-link` mails a link → `/login/confirm?token=` → Continue → `POST /api/auth/email-link/confirm`. An email with an account is signed in; one without lands on `/account/setup`. |
| Google | `GET /api/auth/google/start` → Google → `GET /api/auth/google/callback`. A known Google id, or a Google-verified email that has an account, logs in. A new person lands on `/account/setup`, with Google's name filled in. |
| Account setup | `/account/setup`: the email is proven but has no account. `GET /api/auth/signup` gives the email (and Google's name), `POST` (name) makes a student account and signs in. |
| Session | `GET /api/auth/session` → `{ account }`. `POST /api/auth/logout`. |
| Account | `PATCH /api/account` (name), `DELETE /api/account`. |

Things that are on purpose:

- **The mailed link does nothing alone.** It opens a page with one button, and the button spends the token. Mail
  programs open links to scan them, which would use a link up before the person saw it.
- **Only hashes are stored.** The session cookie and every link carry a random token; the database holds its SHA-256.
- **Two cookies.** `mk_session` (hidden from scripts) is the session. `mk_in` only tells the page that a session
  exists, so a visitor's page never asks the server who they are. The server never trusts `mk_in`.
- **The answer to "email me a link" never says whether the email has an account.**
- **Nobody picks a role.** A new account is a student; a teacher or owner is set by us. Logging in again, by link or
  Google, never changes the name or role of an account.
- **The old addresses still work.** `/register` and `/register/teacher` go to `/login`, `/register/finish` to
  `/account/setup` (`next.config.ts`).
- **Links are limited**: 3 to one email in 15 minutes. A link lives 20 minutes, a session 30 days from its last use.

## Setting it up

Local, once:

```
npm run db:up        # Postgres in Docker, port 5433
npm run db:migrate   # make the tables
```

and `DATABASE_URL=postgres://musickit:musickit@localhost:5433/musickit` in `.env.local`. Without `RESEND_API_KEY`,
development mails nothing: the link is shown on the page and printed in the server log. When Resend refuses the mail
(or can't be reached), development shows the link the same way with Resend's reason, and every environment logs the
reason (`[auth] the log-in email ... was not sent`). An `AUTH_URL` that isn't an http(s) address is ignored. `.env.example` lists the rest
(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_URL`, `AUTH_FROM_EMAIL`).

A changed table: edit `src/lib/db/schema.ts`, then `npm run db:generate` and `npm run db:migrate`. Commit the new file
in `/drizzle`. Production: set `DATABASE_URL` (and run `db:migrate` against it) before the deploy; the site reads at
build time whether it has accounts.

## Without a database

No `DATABASE_URL` means no accounts: the nav shows no Log in, `/login` says accounts aren't open, and the routes answer
503. `useAccount()` gives `account: null`, the local person, who can use everything. This is how the site ran before.

## Not here yet

- **Plans and progress are not in the account.** A logged-in person's data is still in this browser's shared
  localStorage keys, the same as a visitor's. Moving it into the database is the next step.
- No screen asks `can` yet: every tool is open to every role.
- No way to become a teacher from the app: we set the role in the database.
- Which students a teacher has, schools, and giving a plan to a student are not modelled.
- Links are limited per email only, not per network address.
