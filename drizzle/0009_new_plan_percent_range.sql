ALTER TABLE "plans" ALTER COLUMN "new_plan_percent" SET DEFAULT 50;--> statement-breakpoint
-- No plan only reuses and none always writes: every plan gets a chance between 1 and 99. Change them in the database from here on.
UPDATE "plans" SET "new_plan_percent" = 10 WHERE "id" = 'student';--> statement-breakpoint
UPDATE "plans" SET "new_plan_percent" = 25 WHERE "id" = 'teacher-basic';--> statement-breakpoint
UPDATE "plans" SET "new_plan_percent" = 50 WHERE "id" = 'teacher-pro';--> statement-breakpoint
UPDATE "plans" SET "new_plan_percent" = 75 WHERE "id" = 'teacher-unlimited';--> statement-breakpoint
UPDATE "plans" SET "new_plan_percent" = LEAST(99, GREATEST(1, "new_plan_percent"));--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_new_plan_percent_range" CHECK ("plans"."new_plan_percent" between 1 and 99);