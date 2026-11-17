-- The plan picker splits the plans into Individual and Teachers, so a Teacher plan no longer needs "Teacher" in its
-- name: Teacher Basic is Solo, Teacher Pro is Music school, Teacher Unlimited is Unlimited. Ids, prices and allowances
-- stay as they are.
UPDATE "plans" SET "name" = 'Solo' WHERE "id" = 'teacher-basic';--> statement-breakpoint
UPDATE "plans" SET "name" = 'Music school' WHERE "id" = 'teacher-pro';--> statement-breakpoint
UPDATE "plans" SET "name" = 'Unlimited' WHERE "id" = 'teacher-unlimited';
