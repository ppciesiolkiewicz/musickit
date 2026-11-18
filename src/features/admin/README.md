# Admin

Pages under `/admin` for running the app, apart from the tools for building it (`/dev`, `src/features/devtools`).
In development only for now. Rules: `CLAUDE.md`.

## Where each part lives

- `registry.ts`: the pages, read by the index (`src/app/admin/page.tsx`) and the tabs.
- `AdminShell.tsx`, `AdminNav.tsx`: the page frame and its tabs, with a link over to `/dev`.
- `messages/MessagesInbox.tsx`: the inbox.
- Routes: `src/app/api/admin/messages`.

## Messages (`/admin/messages`)

Our inbox for `src/features/messages` (`messages/MessagesInbox.tsx`, over `GET/POST/PATCH /api/admin/messages`):
threads from signed-in users (the chat bubble and the Send feedback page) and contact form messages, newest first,
filtered Open / Closed / All. Opening one shows every message with where it was sent from (path, headings, the text
they had selected) and marks it read on our side; reply, or Close / Reopen. A contact message from a visitor (tagged
"contact") has no reply box, only an email link. `?thread=<id>` opens one; the email we get about a message links there.
Dev only like every /admin page, so to answer production messages run the dev server against the production database.

`/dev/messages`, where the inbox used to be, redirects here and keeps `?thread=`.
