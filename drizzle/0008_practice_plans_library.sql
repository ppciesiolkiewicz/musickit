CREATE TABLE "practice_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"answers" jsonb NOT NULL,
	"model" text NOT NULL,
	"reply" text NOT NULL,
	"source" text NOT NULL,
	"enabled_for_reuse" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "new_plan_percent" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
CREATE INDEX "practice_plans_reuse" ON "practice_plans" USING btree ("enabled_for_reuse");--> statement-breakpoint
-- Internal: the chance an autoplan is written new rather than taken from practice_plans. Student always reuses. Change them in the database from here on.
UPDATE "plans" SET "new_plan_percent" = 0 WHERE "id" = 'student';--> statement-breakpoint
UPDATE "plans" SET "new_plan_percent" = 50 WHERE "id" = 'teacher-basic';
