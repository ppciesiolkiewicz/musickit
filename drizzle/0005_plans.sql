CREATE TYPE "public"."plan_period" AS ENUM('month', 'year');--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"price_cents" integer NOT NULL,
	"period" "plan_period" NOT NULL,
	"students" integer,
	"autoplans_per_month" integer NOT NULL,
	"plan_model" text NOT NULL,
	"note_model" text NOT NULL,
	"batch" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- The plans, priced from /dev/kickstarter's measured tokens (2026-11-15). Change them in the database from here on.
INSERT INTO "plans" ("id", "name", "role", "price_cents", "period", "students", "autoplans_per_month", "plan_model", "note_model", "batch", "enabled", "sort") VALUES
	('student', 'Student', 'student', 2700, 'year', 0, 8, 'claude-haiku-5-5', 'claude-haiku-5-5', false, true, 0),
	('teacher-basic', 'Teacher Basic', 'teacher', 1500, 'month', 10, 40, 'claude-haiku-5-5', 'claude-haiku-5-5', false, true, 1),
	('teacher-pro', 'Teacher Pro', 'teacher', 4900, 'month', 30, 120, 'claude-sonnet-5-5', 'claude-haiku-5-5', true, true, 2),
	('teacher-unlimited', 'Teacher Unlimited', 'teacher', 9900, 'month', NULL, 300, 'claude-sonnet-5-5', 'claude-sonnet-5-5', true, true, 3)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan_id" text DEFAULT 'student' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;