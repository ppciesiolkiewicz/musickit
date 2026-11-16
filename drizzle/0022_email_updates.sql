-- Marketing consent: when a person agreed to emails about what we fix and add (on /account/setup or /account).
-- Null when they haven't, or turned it off. A time, not a flag, so we keep when they said yes.
ALTER TABLE "users" ADD COLUMN "email_updates_at" timestamp with time zone;
