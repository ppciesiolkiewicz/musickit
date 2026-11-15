# Account

Who is using the app, and what their role lets them use: students, teachers and owners. People log in with a link or a
6-digit code we email them, or with Google. There are no passwords and no separate register form: `/login` is the one way in, and a
person with no account yet gets one straight away, named from Google or from the email (the part before the @). The
name is changed on `/account`.

## Parts

- `model.ts`: `Role` (student, teacher, owner; an owner runs a school and can do all a teacher can), `NEW_ACCOUNT_ROLE`
  (student: every account a person makes for themself starts as one; a teacher or owner is made one by us), `Account` (id, name, email, role), `FEATURES` (the parts
  of the app with the roles that may use them; today every role gets every feature), `can(account, feature)` and
  `homePage(account)` (the home page the profile menu's Home page goes to: / for a teacher or owner, /players for a student).
- `loginGuard.ts` + `ui/LoginGuard.tsx`: the client half of the login wall (mounted in the root layout). The server half
  is `src/proxy.ts`, which only checks that the session cookie is there; both read the public paths from
  `src/lib/publicPaths.ts`. The guard catches a stale cookie and the notes creator (its shared note is in the URL hash,
  which the server never sees), and keeps that hash across logging in.
- `AccountStore.ts`: `current()` and `signOut()`, all a page needs.
- `serverAccountStore.ts`: the real store, over `/api/auth`. `accountsOpen()` says whether the site has accounts at all.
- `useAccount.tsx`: `useAccount()` gives `{ account, loaded, can }`. It asks the real session, and nothing at all when
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
| Account | `PATCH /api/account` (name), `DELETE /api/account`. |

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
- **Nobody picks a role.** A new account is a student; a teacher or owner is set by us. Logging in again, by link or
  Google, never changes the name or role of an account.
- **The old addresses still work.** `/register` and `/register/teacher` go to `/login`, `/register/finish` to
  `/login` (`next.config.ts`).
- **Emails are limited**: 3 to one address in 15 minutes, 10 in a day. A link and its code live 1 hour, a session a
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
