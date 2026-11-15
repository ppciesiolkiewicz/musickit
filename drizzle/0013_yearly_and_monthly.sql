-- Every plan can be paid monthly or yearly, with a free trial first. Student: $9 a month or $27 a year. A Teacher plan's
-- year is 8 months (4 free). Plans of other ids keep their price for their period and get the other one from it.
ALTER TABLE "plans" ADD COLUMN "month_cents" integer;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "year_cents" integer;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "trial_days" integer DEFAULT 14 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing" "plan_period" DEFAULT 'year' NOT NULL;--> statement-breakpoint
UPDATE "plans" SET "month_cents" = CASE WHEN "period" = 'month' THEN "price_cents" ELSE ROUND("price_cents" / 3.0) END,
  "year_cents" = CASE WHEN "period" = 'year' THEN "price_cents" ELSE "price_cents" * 8 END;--> statement-breakpoint
UPDATE "plans" SET "month_cents" = 900, "year_cents" = 2700 WHERE "id" = 'student';--> statement-breakpoint
UPDATE "plans" SET "month_cents" = 900, "year_cents" = 7200 WHERE "id" = 'teacher-basic';--> statement-breakpoint
UPDATE "plans" SET "month_cents" = 2900, "year_cents" = 23200 WHERE "id" = 'teacher-pro';--> statement-breakpoint
UPDATE "plans" SET "month_cents" = 5900, "year_cents" = 47200 WHERE "id" = 'teacher-unlimited';--> statement-breakpoint
-- people already on a plan keep paying the way it was priced
UPDATE "users" SET "billing" = "plans"."period" FROM "plans" WHERE "users"."plan_id" = "plans"."id";
