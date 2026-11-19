# Admin

Pages under `/admin` for running the app, apart from the tools for building it (`/dev`, `src/features/devtools`).
Open in development, and in production to a signed-in admin (role `admin`). Rules: `CLAUDE.md`.

## Where each part lives

- `registry.ts`: the pages, read by the index (`src/app/admin/page.tsx`) and the tabs.
- `AdminShell.tsx`, `AdminNav.tsx`: the page frame and its tabs, with a link over to `/dev`.
- `messages/MessagesInbox.tsx`: the inbox.
- `invites/InvitesAdmin.tsx`: teacher invites.
- Routes: `src/app/api/admin/messages`, `src/app/api/admin/invites`.

## Messages (`/admin/messages`)

Our inbox for `src/features/messages` (`messages/MessagesInbox.tsx`, over `GET/POST/PATCH /api/admin/messages`):
threads from signed-in users (the chat bubble and the Send feedback page) and contact form messages, newest first,
filtered Open / Closed / All. Opening one shows every message with where it was sent from (path, headings, the text
they had selected) and marks it read on our side; reply, or Close / Reopen. A contact message from a visitor (tagged
"contact") has no reply box, only an email link. `?thread=<id>` opens one; the email we get about a message links there.
In production an admin answers them on the live site; in development, against whichever database the dev server reads.

`/dev/messages`, where the inbox used to be, redirects here and keeps `?thread=`.

## Teacher invites (`/admin/invites`)

Links we send a teacher so they can try the app on the Teacher Demo plan (`teacher-demo`: a teacher plan with 2
students, free, `enabled` false, so no one can choose it). Type who it is for and press Make invite link; the link,
`/join/<token>`, is shown once (only its hash is stored), with Copy link. The list shows each invite and who joined with
it; Delete removes an invite (a teacher who joined keeps the plan). One link, one account. The rules are
`features/account/server/invites.ts`; the teacher's side is `/join/<token>` (`features/account/ui/JoinForm.tsx`).
The link points at this server when the database is local, else at the public site (`SITE_URL`), so a link made in
development against the release database works for the teacher.
