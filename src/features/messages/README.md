# Messages

Signed-in users write to us, and we answer. Most messages are feedback on the app's text: a step that reads badly, a
section that is wrong. So each message carries where it was sent from. Design:
`docs/superpowers/specs/2026-11-17-messages-design.md`.

## The three ways in

- **The chat bubble** (`ui/Bubble.tsx`, mounted in `src/app/layout.tsx`). Signed-in users only, at the bottom left, away
  from the Rec tab, the day timer and the dev Notes button; on a phone lifted over the day timer by `--corner-stack`. Hidden
  where it would cover a tool (`model/placement.ts`). It opens a panel on the user's newest thread, with a list of
  their threads and New message. A message goes into the thread open in the panel.
- **The Send feedback page** (`/feedback`, `ui/FeedbackPage.tsx`, `FEEDBACK_HREF`). Linked from the profile menu
  and the beta line on `/account`; `/account#feedback` sends people here. Each send starts a new thread.
- **The contact form** (`/api/contact`, `src/features/contact`). Anyone can use it. Each message is also saved here as a
  new thread: the sender's when they are signed in, else one with only the email they typed.

## Where each part lives

- `model/message.ts`: the checks (body, context and their limits), the preview line, unread, the 10-minute email gap.
- `model/placement.ts`: where the bubble hides; the course section a message is about (`refOf`).
- `ui/pageContext.ts`: reads the page when the bubble opens: path, title, the headings above the selected text (or
  the middle of the screen), the selected text.
- `server/repo.ts` (+ `repo.memory.ts`, `repo.drizzle.ts`, `store.ts`): the `message_threads` and `messages` tables.
- `server/messages.ts`: what the routes do (post, read, reply, close, contact messages). Tested over the memory repo.
- `server/mail.ts`: the email we get about a new message, with a link to `/admin/admin/messages?thread=<id>`.
- Routes: `src/app/api/me/messages` (the user), `src/app/api/admin/messages` (us, the `admin` permission; open to anyone in development).
- Our inbox: `/admin/admin/messages` (`src/features/admin/messages/MessagesInbox.tsx`, see `src/features/admin`).

## Not yet

- Teacher and student threads (`kind` is `support` only).
- The plan day or exercise id in `ref`: those pages don't name it in the URL, so their messages carry the headings.
- Emailing the user when we reply. The bubble's dot is how they find out.
