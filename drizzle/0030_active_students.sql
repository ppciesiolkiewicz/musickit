-- Active students: a teacher's plan limits the students given a training plan in a calendar month, plus a few extra
-- free (features/students/model/places.ts). planned_on is the teacher's day of the last week given; a student added
-- before this has none and counts from the next week the teacher makes.
ALTER TABLE "plans" ADD COLUMN "extra_students" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "teacher_students" ADD COLUMN "planned_on" date;--> statement-breakpoint
UPDATE "plans" SET "extra_students" = 2 WHERE "id" = 'teacher-basic';--> statement-breakpoint
UPDATE "plans" SET "extra_students" = 3 WHERE "id" = 'teacher-pro';
