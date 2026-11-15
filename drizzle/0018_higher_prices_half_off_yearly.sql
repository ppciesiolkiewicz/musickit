-- Prices up, so fewer accounts pay the fixed costs (about $879 a year): on 0017's prices that took 50 Student accounts
-- paid yearly, now 26. Monthly prices about double; a year is half of twelve months on every plan offered (was a third
-- off, 47% on Student), so the Yearly switch reads "Save 50%".
-- Student $5.99 / $36, Teacher Basic $11.99 / $72, Pro $29.99 / $180.
-- Teacher Unlimited is gone: a price for any number of students read oddly beside Pro's 50, so a teacher with more
-- students writes to us (the line under the plans) and gets a plan made for them, a row of its own. An account that was
-- on it has no plan and chooses again on /account/setup (prelaunch: test accounts only).
-- Students, allowances and reuse of the other plans stay as 0017 set them.
UPDATE "plans" SET "month_cents" = 599, "year_cents" = 3600 WHERE "id" = 'student';--> statement-breakpoint
UPDATE "plans" SET "month_cents" = 1199, "year_cents" = 7200 WHERE "id" = 'teacher-basic';--> statement-breakpoint
UPDATE "plans" SET "month_cents" = 2999, "year_cents" = 18000 WHERE "id" = 'teacher-pro';--> statement-breakpoint
UPDATE "users" SET "plan_id" = NULL WHERE "plan_id" = 'teacher-unlimited';--> statement-breakpoint
DELETE FROM "plans" WHERE "id" = 'teacher-unlimited';
