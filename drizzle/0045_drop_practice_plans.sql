DROP TABLE "practice_plan_blocks" CASCADE;--> statement-breakpoint
DROP TABLE "practice_plans" CASCADE;--> statement-breakpoint
ALTER TABLE "plans" DROP CONSTRAINT "plans_new_plan_percent_range";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "new_plan_percent";