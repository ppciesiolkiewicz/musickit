ALTER TABLE "auth_tokens" ADD COLUMN "code_hash" text;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD COLUMN "tries" integer DEFAULT 0 NOT NULL;