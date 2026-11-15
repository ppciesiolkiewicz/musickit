-- Monthly prices end in .99: Student $3.99 (was $9), Teacher Basic $8.99, Pro $28.99, Unlimited $58.99. Yearly prices stay.
UPDATE "plans" SET "month_cents" = 399 WHERE "id" = 'student';--> statement-breakpoint
UPDATE "plans" SET "month_cents" = 899 WHERE "id" = 'teacher-basic';--> statement-breakpoint
UPDATE "plans" SET "month_cents" = 2899 WHERE "id" = 'teacher-pro';--> statement-breakpoint
UPDATE "plans" SET "month_cents" = 5899 WHERE "id" = 'teacher-unlimited';
