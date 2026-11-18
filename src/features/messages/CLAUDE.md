# Messages: rules

- Only signed-in users send and read messages. `/api/me/messages` goes through `signedIn()`, and a thread that isn't
  theirs answers 404, never their messages. Visitors use the contact form; the bubble renders nothing for them.
- What a message carries is checked in `model/message.ts` and nowhere else: body trimmed, 1 to 4000 characters
  (`MAX_MESSAGE`); context fields optional and cut to size (path on this site only, at most 300; title 120; up to 4
  headings of 80; ref and source 80; selection 500; email only if it looks like one). Junk context is dropped, never a
  reason to refuse the message.
- A user may have several threads. Writing in a closed thread reopens it. The user never sees "closed"; it is our
  inbox state.
- We are emailed for up to 3 of a user's messages in any 10 minutes, counted across all their threads (`EMAIL_BURST`,
  `EMAIL_WINDOW_MS`), so a quick follow-up still reaches us but a flood doesn't eat the Resend quota log-in shares. A
  failed email never fails the send.
  Contact form messages send no email from here: the contact route sends its own.
- Our side is dev only: `/admin/messages` and `/api/admin/messages` 404 in a production build (`devGate()`). To answer
  production messages, run the dev server against the production database.
- Every fetch in the bubble and the feedback page goes through `send()` in `features/account/ui/parts.tsx` (timeout,
  the account header) and shows its error inline. Typed text stays in the box until a send succeeds.
- Keep the bubble off a tool's controls: add the page to `HIDE` in `model/placement.ts` (with a test line) rather than
  letting it cover a button. The open panel sits above the Rec tab (z 2450) and below the recorder's panel (z 2500).
- Interface text here is written with `design:ux-copy` and "Words about the app" in `teaching-voice`. The bubble is
  named "Messages" on the screen; the panel's title is "Message us".
