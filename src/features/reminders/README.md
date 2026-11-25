# Reminders

A player's daily practice reminder, by email, sent with no attunr tab open.

- **Settings**: on /plan, **Email me at** and a quarter-hour time (`ui/ReminderControl.tsx`), saved through
  `GET`/`PATCH /api/me/reminder` into the `reminders` table (`enabled`, `time`, `zone`, `sent_on`). The browser's time
  zone is saved with it and again when the page opens in another zone. No row: no reminder. A saved change shows a
  toast saying what the player now gets (on, off, moved); the quiet zone re-save shows none.
- **At setup**: /account/setup renders `ui/SetupWithReminder.tsx`, which puts **Remind me to practise at**
  (`ui/ReminderSetupBox.tsx`) first among the setup boxes, on at 18:00, and sends it as `reminder` in the setup body.
  The route saves it with `startReminder` (`server/defaults.ts`): missing or broken, on at 18:00; a reminder the account
  already has is kept. A failed save is logged and the setup still goes on.
- **The run** (`server/run.ts`): an outside scheduler calls `POST /api/cron/reminders` every 15 minutes. For each
  enabled row it is due at its local time or up to 14 minutes after (`dueOn` and `SEND_WINDOW`, `model.ts`), once per
  local date, and only while today's plan wants one (`planWantsReminder` in `plan/model/reminder.ts`; a teacher's
  student: today's teacher day not finished). A reminder goes at its time or not at all: a missed or failed run means
  none that day, never a late one. `sent_on` is claimed with one conditional UPDATE before sending, so two runs at once
  send one email; a failed send is unclaimed so a retry in the same 15 minutes tries again. The route answers 500 when
  any email failed (the counts are in the body), so the scheduler marks the run failed.
  Players are read one after another: past a few thousand enabled rows it wants a `next_due_at` column.
- **The email** (`server/mail.ts`): "Time to practise", the plan's line, Open today's plan, and Stop these emails
  (`/reminders/off?token=`, one button, so a mail scanner changes nothing) plus `List-Unsubscribe` and
  `List-Unsubscribe-Post` headers posting to `/api/reminders/off?token=` with no login. The token is the account id and
  an HMAC with `SERVER_SIGNING_KEY` (`server/token.ts`).

## Env

- `CRON_SECRET`: the scheduler's bearer. Unset: the route answers 503.
- `SERVER_SIGNING_KEY`: signs the unsubscribe links. Unset: the run answers 503 (no email without a working unsubscribe).
  Changing it breaks the unsubscribe links in emails already sent (they answer 400 and point to /plan).
- `RESEND_API_KEY`: as for every email. Unset: nothing is sent and the reminder is not marked sent.

How a failure shows: the scheduler (cron-job.org) records each run's status and can email on a failed one; set it to
email after one failure. That covers a 401 or 503, a timeout (504 past `maxDuration`, 60 s) and an email that failed (500).
A scheduler that doesn't call at all shows only as a gap in its own run list.

The scheduler's call:

```
every 15 minutes (at :00, :15, :30, :45):
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://www.attunr.app/api/cron/reminders
```

From this Mac: `npm run cron:prod` (`scripts/cron-reminders.mjs`) makes that call now and on every quarter hour until
Ctrl+C, and keeps the Mac awake while it runs. It reads production's secret as `PROD_CRON_SECRET` from `.env.local`
(`CRON_URL` overrides the address). The route is safe to call twice, so restarting it sends nothing twice.

Not built: browser push, asking for the reminder on /join and /welcome (tasks.txt, Reminders3 and Reminders4).
