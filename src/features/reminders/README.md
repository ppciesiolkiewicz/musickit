# Reminders

A player's daily practice reminder, by email, sent with no attunr tab open.

- **Settings**: on /plan, **Email me at** and a quarter-hour time (`ui/ReminderControl.tsx`), saved through
  `GET`/`PATCH /api/me/reminder` into the `reminders` table (`enabled`, `time`, `zone`, `sent_on`). The browser's time
  zone is saved with it and again when the page opens in another zone. No row: no reminder.
- **The run** (`server/run.ts`): an outside scheduler calls `POST /api/cron/reminders` every 15 minutes. For each
  enabled row it is due in the hour after its local time (`dueOn`, `model.ts`), once per local date, and only while
  today's plan wants one (`planWantsReminder` in `plan/model/reminder.ts`; a teacher's student: today's teacher day not
  finished). `sent_on` is claimed with one conditional UPDATE before sending, so two runs at once send one email; a
  failed send is unclaimed so the next run in the hour tries again. A run missed for over an hour skips that day.
  Players are read one after another: past a few thousand enabled rows it wants a `next_due_at` column.
- **The email** (`server/mail.ts`): "Time to practise", the plan's line, Open today's plan, and Stop these emails
  (`/reminders/off?token=`, one button, so a mail scanner changes nothing) plus `List-Unsubscribe` and
  `List-Unsubscribe-Post` headers posting to `/api/reminders/off?token=` with no login. The token is the account id and
  an HMAC with `REMINDER_SECRET` (`server/token.ts`).

## Env

- `CRON_SECRET`: the scheduler's bearer. Unset: the route answers 503.
- `REMINDER_SECRET`: signs unsubscribe links. Unset: the run answers 503 (no email without a working unsubscribe).
- `RESEND_API_KEY`: as for every email. Unset: nothing is sent and the reminder is not marked sent.

The scheduler's call:

```
every 15 minutes (at :00, :15, :30, :45):
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://www.attunr.app/api/cron/reminders
```

Not built: browser push, asking for the reminder at setup (tasks.txt, Reminders3 and Reminders4).
