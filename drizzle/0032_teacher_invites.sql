CREATE TABLE "teacher_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"plan_id" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_by" uuid,
	"claimed_at" timestamp with time zone,
	CONSTRAINT "teacher_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "teacher_invites" ADD CONSTRAINT "teacher_invites_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_invites" ADD CONSTRAINT "teacher_invites_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "teacher_invites_created" ON "teacher_invites" USING btree ("created_at");--> statement-breakpoint
-- Teacher Demo: a teacher plan for 2 students, free and never offered (enabled false). A teacher gets it only through an
-- invite link made on /admin/invites. 8 autoplans a month: a week each for 2 students. Reuse first, like every plan.
INSERT INTO "plans" ("id", "name", "role", "month_cents", "year_cents", "trial_days", "students", "extra_students", "autoplans_per_month", "batch", "enabled", "sort", "new_plan_percent") VALUES
	('teacher-demo', 'Teacher Demo', 'teacher', 0, 0, 0, 2, 0, 8, false, false, 98, 1)
ON CONFLICT ("id") DO NOTHING;
