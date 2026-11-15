-- Lower prices, paid for by reuse: most autoplans come from the practice_plans library (pre-written Fable plans), so the
-- chance of a new one drops. Margins near 85-90% at these chances. Change them in the database from here on.
UPDATE "plans" SET "price_cents" = 1500, "new_plan_percent" = 5 WHERE "id" = 'student';--> statement-breakpoint
UPDATE "plans" SET "price_cents" = 900, "new_plan_percent" = 10 WHERE "id" = 'teacher-basic';--> statement-breakpoint
UPDATE "plans" SET "price_cents" = 2900, "new_plan_percent" = 15 WHERE "id" = 'teacher-pro';--> statement-breakpoint
UPDATE "plans" SET "price_cents" = 5900, "new_plan_percent" = 25 WHERE "id" = 'teacher-unlimited';
