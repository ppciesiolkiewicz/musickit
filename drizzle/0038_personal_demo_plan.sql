-- Personal Demo: a personal (student) plan, free and never offered (enabled false). A player gets it only through a
-- personal invite link made on /admin/invites. Same allowance as Student.
INSERT INTO "plans" ("id", "name", "role", "month_cents", "year_cents", "trial_days", "students", "extra_students", "autoplans_per_month", "batch", "enabled", "sort", "new_plan_percent") VALUES
	('personal-demo', 'Personal Demo', 'student', 0, 0, 0, 0, 0, 8, false, false, 97, 1)
ON CONFLICT ("id") DO NOTHING;
