# Messages: a chat bubble for feedback, read at /dev/messages

Date: 2026-11-17. Status: draft, for review.

## Why

The app's text (course sections, seed exercises, plans, interface copy) isn't perfect yet, and we want players to tell
us where it reads badly, at the moment they hit it, with the place attached. We also want to answer them. Hosted chat
tools cost money or brand the widget; our own Postgres costs nothing, and the messages sit next to the rest of our data.

This is one of three feedback channels, each kept separate:

| Channel | Who | Shape | Read at |
| --- | --- | --- | --- |
| **Messages** (new) | signed-in users | a two-way thread with us, each message carrying where it was sent from | `/dev/messages` |
| ~~Send feedback form~~ (exists, `/account#feedback`) | signed-in users | replaced by Messages | — |
| **Contact form** (exists, `src/features/contact`) | anyone, signed in or not | one message with an email; we answer by email | email + blob, and now also `/dev/messages` |
| **Plan reviews** (exists) | players finishing a plan | stars + "why" | `/dev/plan-reviews`, unchanged; may feed the AI later (TBD, not this work) |

## Goals

- A signed-in user can send us a message from any page, through a standard chat bubble, without leaving what they
  were doing.
- Each message records where it was sent from, without the user filling anything in, so "this step makes no sense"
  arrives with the page and the exercise/plan/section attached.
- We read every thread at `/dev/messages`, reply, and close a thread when it's dealt with.
- The user sees our reply in the bubble's panel; the bubble shows an unread dot.
- Contact form messages are also stored in the DB and listed at `/dev/messages`.
- We get an email for each new message (reusing the contact form's Resend setup).

## Non-goals

- Teacher ↔ student messages (NEW12). Later, on the same tables, with a thread kind. Don't build it now, but don't
  design the table so it can't hold it (see the schema).
- Real-time delivery (websockets, Supabase Realtime), typing indicators, read receipts shown to the user, attachments,
  emoji, editing or deleting messages.
- Emailing the user when we reply. The unread dot is enough for now.
- Replying to logged-out contact messages inside the app: we answer those by email, as today.
- Changing plan reviews.
- A production admin page. See "Where /dev/messages runs".

## Anti-goals (would be a failure even if it works)

- The bubble covering controls a player needs while practising (looper, tuner, timers in zoom, the practice view's
  bottom bar).
- A visitor who isn't signed in being pushed to log in by the bubble. They don't see the bubble at all; the contact
  form is theirs.
- A failed send that loses the typed text or fails silently (house rule: every failure gets a toast or inline error,
  every fetch a timeout).
- Cheerful chat-widget copy ("Hi there! 👋 How can we help?"). Interface copy follows `design:ux-copy` with "Words
  about the app" in `teaching-voice`: plain, short, no exclamation marks.

## Decided

### Who and where

- **Only signed-in users** see the bubble and can send messages. The API refuses everyone else (401).
- **Standard chat bubble**, fixed at the bottom-right, on every page, for signed-in users only.
- **On mobile it is more tucked away** (user's words: "somewhat more hidden"). *My call:* smaller, half off the
  right edge or tucked into the corner, still always reachable; the builder picks the exact form and checks it at
  phone width.
- Clicking it opens a panel: our replies and their messages, oldest at top, a text box at the bottom, Send. On a phone
  the panel fills the screen with a close button.
- **Dev:** the dev-only CopyNotes button (`src/features/devtools/copy/CopyNotes.tsx`) already sits at the bottom-right.
  *My call:* in dev the bubble sits just above it (or left of it) so both work. In production CopyNotes isn't there.

### Context sent with each message

*My call:* the client attaches, without asking the user:

- `path`: the URL path and query (e.g. `/plan?day=3`).
- `title`: `document.title`.
- `under`: the nearest headings above the visible content, read from the DOM (the same idea as `underOf` in
  `src/features/devtools/copy/context.ts`). Note: CopyNotes' React-fiber and source lookups only work in dev; don't use
  them here.
- `ref`: the exercise / plan / course-section id when the page knows one. *Builder:* find the cheapest way, e.g. a small
  React context that pages with an id set, or read it from the URL. Start with the URL alone if that covers the main
  cases; leave a TODO for the rest.
- `selection`: if the user had text selected on the page when they opened the bubble, that text (trimmed, max ~500
  chars). This is the most direct "this sentence is wrong".

The panel shows a one-line hint of what will be attached ("About: Day 3 · Alternate picking", or the page title), so
the user knows we'll see where they were. The context is stored per message (a thread can span pages).

### Threads

- One **thread per user** for support/feedback. A user's first message creates it; later messages go into it.
- A thread is **open** or **closed**. We close it in `/dev/messages`. When the user writes again, it reopens. *My call:*
  the user doesn't see "closed"; it's our inbox state only.
- Unread, both ways: a thread has `userReadAt` and `adminReadAt`. The bubble's dot shows when there's a message from us
  newer than `userReadAt`; opening the panel sets it. `/dev/messages` marks threads with a user message newer than
  `adminReadAt`; opening a thread sets it.

### The Send feedback form goes

The bubble **replaces** the signed-in Send feedback form (`src/features/account/ui/FeedbackForm.tsx` on
`/account#feedback`, decided by the user). Remove the form; "Send feedback" in the profile menu (`FEEDBACK_HREF` in
`AccountLink.tsx`) and the beta line on `/account` open the bubble's panel instead (*my call:* a small client event or
context the bubble listens to; `#feedback` links in old emails should still open the panel). Its copy promised email
replies; the panel is now where replies arrive. Update the account feature's README and CLAUDE.md in the same commit.

### Contact form messages

- `POST /api/contact` keeps doing what it does (email + blob) and **also inserts a row** in the DB.
- If the sender is signed in (session cookie present and valid), the message goes into their thread like any message,
  with `source` and the typed email as context (`/dev/messages` shows the email when it differs from the account's).
  *My call:* the contact route already sends its own email, so this insert sends no second one and doesn't touch
  `emailed_at`.
- If not, it's stored as a standalone contact message: email, text, source, time, no user. We reply by email (Reply-To
  is already the sender). In `/dev/messages` it shows with a "contact" tag and a mailto link instead of a reply box.
- The route still succeeds if any of email/blob/DB worked. *My call:* keep the blob write for now; drop it later once the
  DB path has proven itself.

### Delivery

- No websockets. The panel polls the thread every ~20 s while open; the bubble checks the unread count on page load and
  then every ~60 s while the tab is visible (`document.visibilityState`). One request each, cheap.
- Each fetch has a timeout and shows an error on failure; the typed text stays in the box until a send succeeds.

### Email to us

- Each new user message emails us through Resend, reusing `contactTo` / `contactEmail`-style helpers in
  `src/features/contact/contact.ts`: who, the text, the context, and a link to `http://localhost:3000/dev/messages?thread=<id>`.
- *My call:* to avoid a flood, at most one email per thread per 10 minutes (skip if the previous user message in the
  thread was emailed less than 10 minutes ago).
- If Resend isn't configured, the message is still stored; no error to the user.

### /dev/messages

- A dev page like `/dev/plan-reviews`: `DevShell`, server-rendered list plus a client part for replying. Add it to the
  devtools registry/nav.
- Left: all threads and standalone contact messages, newest activity first. Each row: user name/email, first line of
  the last message, time, unread mark, open/closed, "contact" tag. Filter: open / closed / all (default open).
- Right (or below on narrow screens): the selected thread, every message with its context shown small under it (path
  as a link, `under`, `ref`, the selected text quoted). Reply box. Close / Reopen button.
- `?thread=<id>` selects a thread (the email links here).
- Replies are sent as "admin" (no admin user model; see below).

### Where /dev/messages runs

`/dev/*` answers 404 in a production build (`src/app/dev/layout.tsx`, `devOnly()`), and in dev needs no login. So
`/dev/messages` runs only on our own machine, against whatever `DATABASE_URL` in `.env.local` points to. To read and
answer production messages we run the dev server against the production DB. **This is accepted for now** (decided by
the user: "I want to see messages in /dev/messages"). The dev API routes for it must use the same `devOnly()` gate, so
nothing that replies as admin exists in production.

## Schema (my call, the builder may adjust names)

```
message_threads
  id            uuid pk
  kind          text  not null default 'support'   -- later: 'teacher' (NEW12)
  user_id       uuid  null  → users.id on delete cascade   -- null for a standalone contact message
  email         text  null                                -- for contact messages without a user
  status        text  not null default 'open'       -- 'open' | 'closed'
  last_at       timestamptz not null               -- for sorting
  user_read_at  timestamptz null
  admin_read_at timestamptz null
  emailed_at    timestamptz null                    -- for the 10-minute email limit
  created_at    timestamptz not null
  unique (user_id) where kind = 'support' and user_id is not null

messages
  id         uuid pk
  thread_id  uuid not null → message_threads.id on delete cascade
  from_admin boolean not null
  body       text not null  (max 4000, like MAX_MESSAGE)
  context    jsonb null      -- { path, title, under[], ref, selection, source }
  at         timestamptz not null
  index (thread_id, at)
```

A standalone contact message is a thread with `user_id` null, `email` set and one message. That keeps
`/dev/messages` to one list.

Migration via `npm run db:generate` then `db:migrate`. Check `.env.local` `DATABASE_URL` before migrating (it may be
Supabase). After the schema changes, offer to update the DB schema ER diagram artifact (`npm run db:diagram` too).

## API (my call)

Signed-in user (pattern: `src/app/api/me/progress/route.ts`, `signedIn(req)`):

- `GET /api/me/messages` → `{ thread: { status, messages[] } | null, unread: number }`. `?count=1` returns only
  `{ unread }` for the bubble's dot.
- `POST /api/me/messages` `{ body, context }` → creates the thread if needed, appends, reopens if closed, emails us.
- `POST /api/me/messages/read` → sets `user_read_at`.

Dev only (gated by `devOnly()`, under `/api/dev/messages`):

- `GET` list threads (filter by status), `GET ?thread=<id>` one thread (sets `admin_read_at`).
- `POST` reply `{ threadId, body }`; `POST` close/reopen `{ threadId, status }`.

Validation and size limits live in a pure model module with tests (like `parseContact`).

## Where the code goes

A new feature folder, `src/features/messages/` with `README.md` and `CLAUDE.md` (repo rule), `model/` (parse,
validate, context shape, unread logic — unit tested), `server/` (repo on drizzle), `ui/` (Bubble, Panel). The dev page
under `src/features/devtools/messages/` and `src/app/dev/messages/page.tsx`. The bubble mounts in `src/app/layout.tsx`
next to `QuickRecord` / `CopyNotes`, rendering nothing until `useAccount()` is loaded with an account.

## Left to the builder

- Exact look of the bubble and panel (use the existing UI kit in `src/components/ui`; read its `CLAUDE.md`).
- Which pages hide the bubble or move it because it covers practice controls. Check at least: looper, tuner, practice
  view with timers in zoom, plan view, on desktop and phone width. Hide it entirely where it can't fit, rather than
  covering a control.
- All interface strings (bubble label, panel title, placeholder, empty state, errors), written with `design:ux-copy`
  and "Words about the app"; report them old → new.
- How `ref` is found per page type.

## Done means

- Tests for the model module and the routes' validation; `tsc` and eslint clean.
- In the browser (dev server, local DB): a signed-in user sends a message from a plan day with text selected; it shows
  in `/dev/messages` with path, headings and the selection; reply; the bubble shows the dot; the user reads it; close
  the thread; the user writes again and it reopens. A logged-out contact form message shows with the "contact" tag. A
  visitor sees no bubble. Checked at phone width.
