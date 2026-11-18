-- The terms of use: when a person agreed to them on /account/setup, and which (the date on /terms, TERMS_UPDATED).
-- Null for an account that has not set up yet.
ALTER TABLE "users" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "terms_version" text;