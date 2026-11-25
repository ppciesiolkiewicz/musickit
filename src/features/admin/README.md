# Admin

Pages under `/admin` for running the app, apart from the tools for building it (`/dev`, `src/features/devtools`).
Open in development, and in production to a signed-in account with the `admin` permission (`users.permissions`). Rules: `CLAUDE.md`.

## Where each part lives

- `registry.ts`: the pages, read by the index (`src/app/admin/page.tsx`) and the tabs.
- `AdminShell.tsx`, `AdminNav.tsx`: the page frame and its tabs, with a link over to `/dev`.
- `messages/MessagesInbox.tsx`: the inbox.
- `invites/InvitesAdmin.tsx`: teacher invites.
- `src/app/admin/users/page.tsx`: the users list, a server page over `listUsers` and `listSessionTimes` on `AuthRepo`
  and `listPlanSummaries` on `UserDataRepo`, drawn by `users/UsersTable.tsx`.
- Routes: `src/app/api/admin/messages`, `src/app/api/admin/invites`.

## Users (`/admin/users`)

Every account, newest first: name, email, role, the day it was made, its last log-in and when it was last seen, and
how many plans it holds (its own, the running one and earlier ones, plus any a teacher gave). Under each row, its latest
questionnaire answers fold open: areas, minutes a day and how many times it answered, then each topic's picked line,
voice, keys, styles and notes, in the questionnaire's own words.

Log-in times come from `sessions`: the newest `created_at` and `last_seen_at` over all the account's browsers.
`last_seen_at` moves at most once a day, and logging out deletes the session, so an account logged out everywhere
shows a dash. Plan counts and answers are summed up in the database from the `plan` document, which is never loaded
whole.

## Messages (`/admin/messages`)

Our inbox for `src/features/messages` (`messages/MessagesInbox.tsx`, over `GET/POST/PATCH /api/admin/messages`):
threads from signed-in users (the chat bubble and the Send feedback page) and contact form messages, newest first,
filtered Open / Closed / All. Opening one shows every message with where it was sent from (path, headings, the text
they had selected) and marks it read on our side; reply, or Close / Reopen. A contact message from a visitor (tagged
"contact") has no reply box, only an email link. `?thread=<id>` opens one; the email we get about a message links there.
In production an admin answers them on the live site; in development, against whichever database the dev server reads.

`/dev/messages`, where the inbox used to be, redirects here and keeps `?thread=`.

## Invites (`/admin/invites`)

Links we send a teacher so they can try the app on the Teacher Demo plan (`teacher-demo`: a teacher plan with 2
students, free, `enabled` false, so no one can choose it), or a player on the Personal Demo plan (`personal-demo`: a
player's own plan, free, `enabled` false). Pick Teacher or Personal under Invite for, type who it is for and press Make invite link; the link,
`/join/<token>`, is shown with Copy link and Copy email. The list shows each invite, its Copy link and Copy email (the
token is kept beside its hash; invites made before that say "Link not saved") and who joined with
it; Delete removes an invite (a teacher who joined keeps the plan). One link, one account. The rules are
`features/account/server/invites.ts`; the teacher's side is `/join/<token>` (`features/account/ui/JoinForm.tsx`).
The link points at this server when the database is local, else at the public site (`SITE_URL`), so a link made in
development against the release database works for the teacher.
Copy email copies the invite email (`inviteEmail` in `features/account/emailHtml.ts`, the same look as the log-in
email) as HTML, so it pastes drawn into a mail program, and as its HTML source for a plain-text box. Nothing sends it.
