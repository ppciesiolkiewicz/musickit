ALTER TABLE "users" ADD COLUMN "plan_ends_at" timestamp with time zone;--> statement-breakpoint
-- IndieAppCircle: a teacher plan like Solo (15 students, 2 extra a month), free and never offered (enabled false). A
-- teacher gets it only from the INDIEAPPCIRCLE join code (/join/INDIEAPPCIRCLE), for 60 days (plan_ends_at).
INSERT INTO "plans" ("id", "name", "role", "month_cents", "year_cents", "trial_days", "students", "extra_students", "autoplans_per_month", "batch", "enabled", "sort") VALUES
	('indieappcircle', 'IndieAppCircle', 'teacher', 0, 0, 0, 15, 2, 8, false, false, 96)
ON CONFLICT ("id") DO NOTHING;
