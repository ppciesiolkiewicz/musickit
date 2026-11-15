-- The free trial is 30 days on every plan (was 14), long enough to make practising with attunr a habit before the first
-- payment. A plan made later for one teacher starts with the same 30. A trial that doesn't pay costs its AI and emails
-- for its days: cents at 1% new plans.
ALTER TABLE "plans" ALTER COLUMN "trial_days" SET DEFAULT 30;--> statement-breakpoint
UPDATE "plans" SET "trial_days" = 30;
