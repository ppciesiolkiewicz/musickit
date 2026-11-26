# Admin

`/admin` is a hub (`src/app/admin/page.tsx`) over three parts: `/admin/admin` (running the app: messages, users, invites;
the `admin` permission), `/admin/content` (the tools for writing lessons; the `content` permission; its pages and frame live in `src/features/devtools`) and `/admin/dev` (the tools for building
the app: the prompt, player data, the code; the `dev` permission; `src/features/devtools`). The hub opens to any of the
three permissions and shows a card for each part the viewer may open (`hub.ts`). Open in development, and in production to a signed-in account with the permission
(`users.permissions`). Old URLs (`/admin/messages`, `/dev/messages`, the old `/dev` pages and so on) redirect: `src/features/devtools/moves.ts`,
read by `next.config.ts`. Rules: `CLAUDE.md`.

## Where each part lives

- `registry.ts`: the pages, read by the `/admin/admin` index (`src/app/admin/admin/page.tsx`) and the tabs.
- `hub.ts`: the hub's cards and `hubSections(open)`.
- `AdminShell.tsx`, `AdminNav.tsx`: the page frame and its tabs, with links back to the hub and over to `/admin/content` and `/admin/dev`, each only when the viewer may open it.
- `messages/MessagesInbox.tsx`: the inbox.
- `invites/InvitesAdmin.tsx`: teacher invites.
- `src/app/admin/admin/users/page.tsx`: the users list, a server page over `listUsers` and `listSessionTimes` on `AuthRepo`
  `listPlanSummaries` on `UserDataRepo` and `listAll` on `ReminderRepo`, drawn by `users/UsersTable.tsx`.
- `users/PermissionTicks.tsx`: one person's Dev, Content and Admin boxes on the users list; `users/messages.ts` holds what it says when a save fails.
- `users/DeleteUser.tsx`: Delete on a users row and its question; `users/deleteLines.ts` turns the count of what goes into its lines.
- Routes: `src/app/api/admin/messages`, `src/app/api/admin/invites`, `src/app/api/admin/users` (PATCH a person's permissions), `src/app/api/admin/users/[id]` (GET what deleting the account takes, DELETE it).

## Users (`/admin/admin/users`)

Every account, newest first: name, email, role, its permissions, its consents, the day it was made, when it was last seen,
and how many plans it holds (its own, the running one and earlier ones, plus any a teacher gave). The consents are three
boxes the admin can't change: Terms of use (`termsAcceptedAt`), News and offers (`emailUpdatesAt`) and Daily reminder
(`listAll` on `ReminderRepo`, ticked when on). Under each row a fold opens on its last log-in, the consents' dates and
versions, the reminder's time, zone and last send, then its latest questionnaire answers: areas, minutes a day and how
many times it answered, then each topic's picked line, voice, keys, styles and notes, in the questionnaire's own words.

Log-in times come from `sessions`: the newest `created_at` and `last_seen_at` over all the account's browsers.
`last_seen_at` moves at most once a day, and logging out deletes the session, so an account logged out everywhere
shows a dash.

Permissions (`dev`, `content`, `admin`, see `features/account/model.ts`) are ticked in place and saved at once with
`PATCH /api/admin/users` (`changePermissions` in `features/account/server/permissions.ts`). A failed save puts the boxes
back and says so under them. An admin can't untick their own Admin, so the last admin can't lock everyone out; in
development a signed-in person without Admin may change their own row, and with no login there is no "own" row.

Delete, on every row but your own, asks first: it lists what goes with the account, counted (`GET /api/admin/users/<id>`,
`userFootprint` on `AuthRepo`), what stays (their students' accounts, which lose their teacher; payment records, with no
account on them), and warns when their Stripe subscription is still live, since deleting doesn't cancel it. Delete
account deletes it all in one step (`adminDeleteUser` in `features/account/server/adminDelete.ts`, `purgeUser`): the
account and everything the database cascades, plus the invites they joined with and the email links for their email,
which the player's own Delete account leaves. Then their video files. Plan counts and answers are summed up in the database from the `plan` document, which is never loaded
whole.

## Messages (`/admin/admin/messages`)

Our inbox for `src/features/messages` (`messages/MessagesInbox.tsx`, over `GET/POST/PATCH /api/admin/messages`):
threads from signed-in users (the chat bubble and the Send feedback page) and contact form messages, newest first,
filtered Open / Closed / All. Opening one shows every message with where it was sent from (path, headings, the text
they had selected) and marks it read on our side; reply, or Close / Reopen. A contact message from a visitor (tagged
"contact") has no reply box, only an email link. `?thread=<id>` opens one; the email we get about a message links there.
In production an admin answers them on the live site; in development, against whichever database the dev server reads.

`/admin/messages` and `/dev/messages`, where the inbox used to be, redirect here and keep `?thread=`.

## Invites (`/admin/admin/invites`)

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
