ALTER TABLE "users" ALTER COLUMN "plan_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "plan_id" DROP NOT NULL;