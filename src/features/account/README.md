# Account

Who is using the app, and what their role lets them use: students, teachers, owners and admins. People log in with a link or a
6-digit code we email them, or with Google. There are no passwords and no separate register form: `/login` is the one way in, and a
person with no account yet gets one straight away, with no plan, and is held on `/account/setup` until they give their
name (Google's is filled in) and choose a plan, with no payment; the three main sections send them there until then. Both are changed later on `/account`.

**Unsafe play hack (2026-11-19):** any `ppciesiolkiewicz+<anything>@gmail.com` typed into the email box on `/login` is signed in at once, with no email, code or limits (`INSTANT_LOGIN` and `instantSignIn` in `server/auth.ts`, used by `POST /api/auth/email-link`). Anyone who knows the pattern can be those accounts. Remove before real launch.

## Parts

- `model.ts`: `Role` (student, teacher, owner, admin; an owner runs a school and can do all a teacher can; an admin is one of us, can do all an owner can, and opens /dev and /admin in production: `isAdmin`, checked by `features/devtools/server/access.ts`), `NEW_ACCOUNT_ROLE`
  (student: every account a person makes for themself starts as one; a teacher, owner or admin is made one by us), `Account` (id, name, email, role, `taught`: on the `taught` plan, a student a teacher made), `FEATURES` (the parts
  of the app with the roles that may use them; every role gets every feature except `sharePlan` and `students` (having students, see `features/students`), for teachers, owners and admins), `can(account, feature)` and
  `homePage(account)` (the home page the profile menu's Home page goes to: / for a teacher or owner, /players for a student).
- `plans.ts`: `Plan` (a row of the `plans` table: name, the role it gives, a price in US cents a month (`monthCents`, paid monthly) and one a year (`yearCents`, paid yearly), a free trial (`trialDays`), students and `extraStudents` (extra active students a month, free: Solo 2, Music school 3, `0030_active_students`; see `features/students/model/places.ts`),
  AI autoplans a month, Batch, `enabled`, `sort`; every plan's autoplans and notes are written by one model, `SUBSCRIPTION_MODEL`, Haiku 5.5), `choosablePlans`
  (the enabled plans, plus the one the person is on even when turned off), `canChoose` (an enabled plan paid either way, or their own plan, even turned off, paid the other way), `roleOnPlan`, `Billing` (`"month" | "year"`) and the labels.
  Every plan can be paid monthly or yearly (migration `0013_yearly_and_monthly`, 2026-11-15): Student $9 a month or $27 a year,
  Teacher Basic $9 or $72, Pro $29 or $232, Unlimited $59 or $472 (a Teacher year is 8 months), each with 14 days free.
  Now (`0017_lower_prices_reuse_first`, 2026-11-15): Student $2.99 a month or $19 a year, Teacher Basic $5.99 or $48,
  Pro $14.99 or $120, Unlimited $79.99 or $640. Teacher Basic takes 15 students and Pro 50; Unlimited, any number, is
  priced well above Pro so that Pro's 50 reads as the one to take.
  Now (`0018_higher_prices_half_off_yearly`, 2026-11-15): Student $5.99 a month or $36 a year, Teacher Basic $11.99 or $72,
  Pro $29.99 or $180. A year is half of twelve months on each. Raised so that fewer accounts pay the fixed costs: 26
  Student accounts paid yearly, where 0017's prices took 50. Teacher Unlimited is deleted from the table (an account on it has no plan and
  chooses again on `/account/setup`): a price for any number of students read oddly beside Pro's 50.
  Open beta (`0021_open_beta_unlimited`, 2026-11-16): the app is free while we fix bugs. The plans, prices, trial and
  payment box stay as they are and choosing still records the plan, so we see who would pay for what; nothing is
  charged (`BETA_PLAN_LINE`, `ui/PlanPicker.tsx`).
  Teacher Unlimited is back, any number of students, with no price of its own: `pricedWithYou` (`plans.ts`, students
  null), $0 in its row, "Price set with you" on its card and in the payment box. Choosing it, on setup or `/account`, makes a `plan_requests`
  row (one a person, the first kept; `requestPlan` in the repo), which is who we write to; `contacted_at` is set by hand.
  `/account` says "You chose Teacher Unlimited on … We'll email you at … to set the price." while they are on it
  (`request` in `GET /api/account/plan`). It replaced the "More than 50 students?" message.
  The trial is 30 days on every plan (`0020_trial_30_days`, 2026-11-15; the column's default too), shown as "30-day free
  trial, cancel any time" (`trialLabel`).
  How a person pays is `users.billing` (accounts from before kept their plan's old period). The old single price,
  `plans.price_cents` and `plans.period`, is still in the table, unused and nullable, for the build before; drop it in a
  later migration. The free trial is shown, not kept: no trial start is stored and nothing ends it.
  The plans themselves are rows in the database, written by migration `0005_plans` and changed there; their prices and
  allowances come from *Plans* on /dev/costs, which shows what each costs us. Each row also has `new_plan_percent`, internal
  and kept off `Plan`: the chance (0 to 100) that an autoplan on it is written new by the AI; the rest are taken from the
  `practice_plans` library (rows `enabled_for_reuse`). Always 1 to 99, held by a check in the database: no plan only
  reuses and none always writes. The plan is for Haiku to decide each autoplan (reuse a library plan that fits, or write a
  new one), held to this share. Migration `0010_lower_prices_more_reuse` lowered the prices on the strength of reuse and sets
  Student at 5 (its price stays $27 a year, `0011_student_stays_27`), Teacher Basic $9 a month at 10, Pro $29 at 15, Unlimited $59 at 25 (`0015_month_prices_99` makes the monthly prices $3.99 Student, $8.99, $28.99 and $58.99; yearly prices stay): about 85 to 90% margin, which
  needs a library of many pre-written Fable plans. `0017_lower_prices_reuse_first` about halves every price but Unlimited's and sets every
  plan to 1 (nearly all reuse, the lowest the check allows): the AI then costs a few cents to about $5 a player a year,
  and the payment fee is most of the cost (`0018_higher_prices_half_off_yearly` raises the prices and leaves reuse at 1). All of this is history: plans are now put together from the library by our own code, the app doesn't call an AI from the server, and /terms says so.
- Payments (`billing.ts`, `server/stripe.ts`, `server/paymentsEnabled.ts`), off unless `STRIPE_ENABLED=true` (2026-11-24).
  On: an account on a paid plan (`paidThroughCheckout`: not taught, a demo, or priced with you) must have a live
  Stripe subscription (trialing, active, past_due), else `Account.needsPayment` and `needsSetup` hold it on
  `/account/setup`, whose Continue (Continue to payment) saves and opens Checkout (`POST /api/account/checkout`):
  card up front, the plan's trial once per account, `STRIPE_EARLY_COUPON` while the side's early places are open.
  Stripe returns to `GET /api/account/checkout/done`, which records the subscription at once; `POST /api/stripe/webhook`
  keeps status, plan and billing in step (a price's metadata names its plan; prices are made from the plan rows on first
  use, keyed by plan, billing and amount). Every account with a plan before migration `0040_stripe_payments` is
  `payment_exempt`: it keeps that plan free, and `/account` offers it Pay for … on any paid plan; moving to another
  paid plan without paying, or starting to pay, ends the exemption. A subscriber changes plan, card or cancels in
  Stripe's billing portal (Manage billing, `POST /api/account/portal`); `choosePlan` refuses them a paid plan.
  Each paid invoice is kept as an order in `payments` (webhook `invoice.paid`, `recordInvoice`): amount, currency, the plan and billing its price named, Stripe's reason, invoice number and link, when paid; one row per invoice, the trial's $0 first invoice included, kept when the account is deleted (`user_id` set null). Off, nothing here runs and the account has no payment fields. `earlyTaken()` still counts by hand, not from Stripe.
- `ui/SetupForm.tsx` (`/account/setup`): where an account with no plan (`Account.needsSetup`) stays. Its name (empty
  while it is only the email's stand-in, `emailName`; Google's filled in) and a plan from the same list, none chosen for
  them, paid Monthly or Yearly (the switch beside the Plan heading), saved together by `POST /api/account/setup` with
  `{ name, planId, billing }` (`setUpAccount` in `server/auth.ts`: the plan and billing are checked before anything
  changes), then on to the page it was going to. Under the plans, `PaymentBox`: the chosen plan, its price, its free
  trial, and a dashed box where the card details will go. A placeholder: there is no payment provider yet, and the open beta charges nothing.
  Last, under the email box, "I agree to the terms of use" (the words link to `/terms`, in a new tab): never ticked for
  them, and Continue needs it. Sent as `acceptTerms: true`; `setUpAccount` refuses anything else (`error: "terms"`) before
  it saves anything, and keeps `users.terms_accepted_at` and `users.terms_version` (migration `0029_terms_accepted`),
  the date on `/terms` then (`TERMS_UPDATED` in `terms.ts`, which the terms page shows too).
- The early price (`EARLY_OFFER` in `pricing.ts`): 50% off the monthly price of every plan, locked in while the person
  stays subscribed, for the first 20 schools and the first 500 students to sign up. It is for paying monthly only (user,
  2026-11-18, `earlyApplies`): a yearly price is shown and paid as it is, which is what twelve early months come to, so
  while a side's early price is open its cards show no "Save …" on Yearly. A plan priced with the school is half the
  monthly price agreed. /terms has it as its own section ("The early price"). The 20 are the founding partners (`src/lib/foundingOffer.ts` reads it): one picks any teacher
  plan, of any size, at 50% off (`FOUNDING_OFFER`; the old $360 AUD a year is gone). `src/lib/studentOffer.ts` reads the 500. Every page that quotes a
  price shows the early price beside the full one struck through, with the red `DiscountBadge` (`@/components/ui`): the
  plan cards on setup and `/account`, the line over them (`EarlyOffer`, by the side shown), `PaymentBox`, the home
  Pricing section, /kickstarter, the FAQ and the intro video. Shown only: the rows keep the full price.
  How many places are taken is one count for both sides, `earlyTaken()` (`server/earlyTaken.ts`, typed in by hand until
  payments count it; 0 and 0 now), served by `GET /api/early-price` (`{ schools, students: { taken, places }, open }`) and
  read by /kickstarter (its countdown) and `GET /api/account/plan` (`early`: `earlyOpen`, by side). A side's plan cards,
  `EarlyOffer` and `PaymentBox` show the early price only while its places aren't all taken, and /kickstarter drops its
  half price when the 20 have joined. The home Pricing section, the FAQ and the intro video don't read the count yet.
- `?for=teachers` (`TEACHER_SIGNUP` in `loginGuard.ts`, `/account?for=teachers`): where every "Become a founding
  partner" on /kickstarter goes. Signed out, the login page says "Create your teacher account"; a new account's setup
  and `/account` open their plans on the Teachers side (`startAudience`'s `wanted`).
- `ui/EmailUpdates.tsx`: the marketing consent, "Email me news and offers". Unticked until the person ticks
  it: on setup (sent as `emailUpdates` with the rest) and in the Profile card on /account (saved as it changes, `PATCH
  /api/account` with `{ emailUpdates }`). Kept as `users.email_updates_at` (migration `0022_email_updates`), the time of
  the first yes, null when off; `Account.emailUpdates` is whether it is set. Nothing sends these emails yet.
  A Continue that can't go on marks what is missing (a red name field, a red ring round the plans, the terms box, each with its
  line) and scrolls the first of them into view and focuses it.
  The card is wide (`Card wide`): the plans sit side by side and wrap to one column on a phone. Each plan card has its
  own colour (`planHue`, by its place in the list, the same on `/account`; no rose or red, which mean an error).
- The plans are split by who they are for (`AudienceSwitch`, over the plans on setup and `/account`): Individual (the
  Student plan) and Teachers (every Teacher plan), opening on the side of the person's own plan, else Teachers for a
  teacher or owner. Only the shown side's plans can be picked. The Teacher plans are named Solo, Music school and
  Unlimited (`0024_plan_names`, 2026-11-17). The selling words on each card (who it is for, what it gives) and each
  side's line are in `ui/planPitch.ts`, by plan id; prices and allowances still come from the row.
- `ui/PlanPicker.tsx`: the Plan part of `/account` (and `PlanLines`, what a plan gives, shared with the setup page). `GET /api/account/plan` gives `{ plans, current, billing, request }`. The same Monthly/Yearly switch
  and plan cards as setup; picking another plan, or the other billing, shows `PaymentBox` (no trial line: the trial is for a
  new account) and a Move to … (or Pay monthly / Pay yearly) button, which `POST`s `{ planId, billing }` and moves the person
  at once, with no payment during the beta (`choosePlan` in `server/auth.ts`); the page reloads. Leaving a Teacher plan
  for Student says above the button that sharing plans goes. Paying for the same plan the other way never changes the role.
- Teacher invites (`server/invites.ts`, table `teacher_invites`, migration `0032_teacher_invites`): a link we make on
  `/admin/invites` and send a teacher, `/join/<token>` (`JOIN_PATH`, `joinHref` in `loginGuard.ts`). It puts the
  account that opens it on the Teacher Demo plan (`TEACHER_DEMO_PLAN_ID`: teacher, 2 students, 8 autoplans a month,
  free, `enabled` false), with the plan's role (an owner stays an owner). One invite, one account; the invite is found by
  its token's hash, and the token is kept too, so /admin/invites can copy the link again. The page is public (`SHARED` in
  `src/lib/publicPaths.ts`) and stands in for /login: a visitor who isn't logged in sees the invite and logs in on it
  (`LinkForm` with `bare`, email and code or Google), and `pathAfterSignIn` sends a new account straight back to the
  invite, not to setup: `ui/JoinForm.tsx` joins it by itself, titled "Setting up your teacher account" with the plan
  shown, named from the invite's note (else its own name), terms agreed by logging in under the line saying so, email
  updates off. An account that is already set up presses Join as a teacher, since it leaves its plan. A student of a teacher (the
  `taught` plan) can't join. Routes: `GET/POST /api/join/<token>`; the admin's are `/api/admin/invites`.
- Personal invites: the same table, link and page, onto the Personal Demo plan (`PERSONAL_DEMO_PLAN_ID`, migration
  `0038_personal_demo_plan`: student, free, `enabled` false). `makeInvite(deps, note, "personal")`; the invite's kind is
  read from its plan's role (`kindOf`), and the GET says it (`kind`). A new account doesn't join by itself: it sets up on
  the page (`ui/JoinSetup.tsx`: name, email updates, the voice-care box; terms agreed by logging in), then joins and
  goes to /plan. A set-up account presses Join. A teacher who joins becomes a student (an owner stays an owner).
  `inviteEmail(link, kind)` has the words for each.
- `loginGuard.ts` also has `loginWords(next)`: the login page's heading and line, "Create your account or log in to view" when `next` is a plan invite (`/plan/invite/…`), else the usual.
- `loginGuard.ts` + `ui/LoginGuard.tsx`: the client half of the login wall (mounted in the root layout), which also keeps an account with no plan out of the three main sections until `/account/setup`. The server half
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
  (`/account`: the open-beta line with a Send feedback link (to `/feedback`) across the top; under it, on a wide screen, a narrow column with the Profile card (email, role, name), beside a wide Plan card whose plans sit side by side; under everything Log out and Delete account (`DELETE /api/account`; /terms and /privacy promise it here)), `AccountLink` (the corner of the top nav: Log in, or the name with a
  menu of Your profile, Home page, Send feedback and Log out, opened on hover or a tap).
- The Send feedback page is `/feedback` in `src/features/messages` (`FEEDBACK_HREF`): each send starts a new thread with us, answered in the chat bubble. `/account#feedback` sends people there.
- `server/`: sign-in itself, server only.
  - `auth.ts`: the rules, with no HTTP and no SQL in them: `requestEmailLink`, `openEmailLink`, `openEmailCode`, `googleSignIn`,
    `startName`, `pathAfterSignIn`, `setUpAccount`, `sessionAccount`, `signOut`, `rename`.
  - `repo.ts`: what those rules need from storage. `repo.drizzle.ts` is Postgres, `repo.memory.ts` is for tests.
  - `publicPlans.ts`: the plans anyone can choose, for a public page. The Pricing section of `/` and `/players` reads it (rebuilt at most once an hour), so the home pages show the same rows as `/dev/kickstarter/teachers` and `/dev/costs`. Null with no database or no answer in 8 seconds: the section then shows no number and says so.
  - `http.ts`: cookies, the same-site check, `auth()` (null when there is no database), `requestAccount(req)`.
  - `google.ts`: the Google code flow with PKCE. `mail.ts`: the email with the link and the code, sent through Resend.
- `emailHtml.ts`: the look every email shares (`emailPage`, `row`), with no server code, and the teacher invite email (`inviteEmail`), which /admin/invites copies for us to send by hand.

The tables are in `src/lib/db/schema.ts` and the migrations in `/drizzle`.

## The flows

| | |
| --- | --- |
| Email | `/login`: email → `POST /api/auth/email-link` mails a link and a code → either `/login/confirm?token=`, whose script calls `POST /api/auth/email-link/confirm`, or the code typed on `/login` → `POST /api/auth/email-code`. An email with an account is signed in; one without gets an account named from the email, is signed in, and goes to `/account/setup` for its name and plan. |
| Google | `GET /api/auth/google/start` → Google → `GET /api/auth/google/callback`. A known Google id, or a Google-verified email that has an account, logs in. A new person gets an account with Google's name, is signed in, and goes to `/account/setup` to keep the name and choose a plan. |
| Session | `GET /api/auth/session` → `{ account }`. `POST /api/auth/logout`. |
| Account | `PATCH /api/account` (name), `DELETE /api/account`. Both go through `signedIn` (`userData/server/http.ts`), so a page open for another account than the session's gets 409 `account-changed` and never renames or deletes the account logged in now; `send()` in `ui/parts.tsx` sends `X-Account-Id`, and `errorOf` shows the reload line. |

Things that are on purpose:

- **The mailed link does nothing alone.** It opens a page whose script spends the token, with no button to press. Mail
  programs fetch links to scan them; a plain fetch runs no script, so it can't use the link up. (A scanner that runs
  the page's script would; then the person asks for a new link or types the code.)
- **A new account has no plan, and can't use the app until it chooses one.** Signing in stays one step; the account is
  made with Google's name or the email before the @, and `users.plan_id` null (migration `0012_new_accounts_choose_plan`;
  accounts from before it kept Student). While it is null, `Account.needsSetup` is true: `pathAfterSignIn` sends every
  sign-in to `/account/setup?next=…` (`setupHref`, `loginGuard.ts`), and `ui/LoginGuard` sends the app's three places
  there (Practice plan, Interactive notes, Practice: `APP_PLACES` in `src/lib/appPlaces.ts`), keeping the page as `next`.
  Every other page stays open: the landing pages, the FAQ, `/account`. It is held in the browser only: the API routes don't refuse
  an account with no plan, which is a student meanwhile.
- **Only hashes are stored.** The session cookie and every link carry a random token; the database holds its SHA-256
  (a teacher invite keeps its token too, for /admin/invites).
  A code is stored as the SHA-256 of the email and the code.
- **The link and the code are one proof.** They are the same row: using one spends the other. The code works on the
  page that asked for it, so it logs in there even when the email was read on a phone.
- **A code takes 5 tries**, right or wrong, counted before it is compared, so guesses sent at once can't pass the
  limit. With 10 emails a day, that is 50 guesses a day at a million codes.
- **Two cookies.** `mk_session` (hidden from scripts) is the session. `mk_in` only tells the page that a session
  exists, so a visitor's page never asks the server who they are. The server never trusts `mk_in`.
- **The answer to "email me a link" never says whether the email has an account.**
- **A role comes with a plan.** A new account is a student with no plan until it chooses one on `/account/setup`. Choosing a Teacher plan there or on `/account` makes a student a teacher, and choosing Student makes a teacher a student again; an owner or an admin is set by us and keeps that role on any plan. A plan turned off (`enabled = false`) can't be chosen, but whoever is on it keeps it. Logging in again, by link or
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

`npm run db:unplan` takes the account set in its package.json script off its plan (plan_id null; a teacher becomes a student, an owner stays
one), so it is held on `/account/setup` again: for trying the setup page. Same localhost rule as `db:wipe`.

`npm run db:seed-fake` fills a local database with made-up accounts (`scripts/db-seed-fake.ts`, names from
`@faker-js/faker`, the same every run): an owner, teachers with 2 to 6 students each (made with `addStudent`, then a first
week with `makeWeek` when the library is seeded), and students on their own, one of them before setup. A teacher's
student who opened their link started 1 to 4 weeks ago and gets better week by week: the persona's answers with one or
two weak topics a level or two lower, a week made at a time, each one's past days rated (climbing from about 3 stars to
5, the weak topics from 1.5 to 4) with day-timer time before the next week is composed from them, and the teacher moving
a few sliders up before each next week. `-- --no-progress` leaves that out. Every email ends in `@seed.musickit.test`; each run deletes the last run's accounts first, and `-- --wipe` only deletes them.
`-- --teachers N --solo N --seed N` change the numbers. It refuses a database that isn't on this machine unless you pass
`-- --allow-remote`. Log in as one by its email.

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
- Plans aren't paid for yet (the open beta): the payment box is a placeholder, and the free trial isn't started, counted or ended. Practice plans are unlimited on every plan: they are put together by our own code with no AI, so no screen, FAQ line or term shows an allowance (2026-11-18). `autoplansPerMonth` stays on the row, unused, for /dev/costs (`allowanceLabel`); the column goes with the code rename (Rebrand3). A teacher plan's students are counted as active students a month (`studentsLabel`, `ACTIVE_STUDENTS_LINE`; enforced in features/students).
- Schools are not modelled. A teacher's students are: a `teacher_students` row links a teacher to a student account (`addStudent`, `studentsOf`, `studentLink`, `teacherOf`, `markClaimed` on `AuthRepo`; one teacher a student); the student's account is on the `taught` plan (`TAUGHT_PLAN_ID`, free, not `enabled`, so no one chooses it; `Account.taught`) and signs in the first time with a `claim` token (`TokenKind`, stored as a hash, used once). Any sign-in of an account on the `taught` plan (`startSession`: the email link or code, Google, the claim) records the link as claimed the first time (`markClaimed`), so a student who logs in the normal way no longer shows as "Not opened yet". The rules and routes are in `features/students`.
- Links are limited per email only, not per network address.
