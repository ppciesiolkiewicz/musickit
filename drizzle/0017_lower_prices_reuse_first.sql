-- Prices about halved, paid for by reuse: nearly every autoplan comes from the practice_plans library, so each plan writes
-- 1 in 100 new (the lowest the range check allows). At 1% the AI costs a few cents to about $5 a year per player; the
-- payment fee is most of what's left. A Teacher year is still 8 months.
-- More students on the Teacher plans: Basic 15 (was 10), Pro 50 (was 30). Unlimited keeps any number of students and is
-- priced well above Pro, so Pro's 50 reads as the one to take.
-- Student $2.99 / $19, Teacher Basic $5.99 / $48, Pro $14.99 / $120, Unlimited $79.99 / $640.
UPDATE "plans" SET "month_cents" = 299, "year_cents" = 1900, "new_plan_percent" = 1 WHERE "id" = 'student';--> statement-breakpoint
UPDATE "plans" SET "month_cents" = 599, "year_cents" = 4800, "students" = 15, "new_plan_percent" = 1 WHERE "id" = 'teacher-basic';--> statement-breakpoint
UPDATE "plans" SET "month_cents" = 1499, "year_cents" = 12000, "students" = 50, "new_plan_percent" = 1 WHERE "id" = 'teacher-pro';--> statement-breakpoint
UPDATE "plans" SET "month_cents" = 7999, "year_cents" = 64000, "students" = NULL, "new_plan_percent" = 1 WHERE "id" = 'teacher-unlimited';
