ALTER TYPE "public"."auth_token_kind" ADD VALUE IF NOT EXISTS 'claim';--> statement-breakpoint
CREATE TABLE "teacher_students" (
	"teacher_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	CONSTRAINT "teacher_students_teacher_id_student_id_pk" PRIMARY KEY("teacher_id","student_id"),
	CONSTRAINT "teacher_students_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
ALTER TABLE "teacher_students" ADD CONSTRAINT "teacher_students_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_students" ADD CONSTRAINT "teacher_students_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- The plan of a student a teacher made an account for: free, never offered (enabled false), no autoplans of its own.
INSERT INTO "plans" ("id", "name", "role", "month_cents", "year_cents", "trial_days", "students", "autoplans_per_month", "batch", "enabled", "sort", "new_plan_percent") VALUES
	('taught', 'Student of a teacher', 'student', 0, 0, 0, 0, 0, false, false, 99, 50)
ON CONFLICT ("id") DO NOTHING;
