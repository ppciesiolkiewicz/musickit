-- Open beta: the app is free while we fix bugs, and the plans ask which one a person would want once we charge.
-- Teacher Unlimited is back, for any number of students, with no price of its own: the price is set with each teacher
-- (`pricedWithYou`, students NULL), so its month and year prices are 0 and the screen says "Price set with you".
-- Choosing it makes a plan_requests row, who we write to. It replaces the "More than 50 students?" message.
CREATE TABLE "plan_requests" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contacted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "plan_requests" ADD CONSTRAINT "plan_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_requests" ADD CONSTRAINT "plan_requests_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "plans" ("id", "name", "role", "month_cents", "year_cents", "students", "autoplans_per_month", "batch", "enabled", "sort", "new_plan_percent") VALUES
	('teacher-unlimited', 'Teacher Unlimited', 'teacher', 0, 0, NULL, 300, true, true, 3, 1)
ON CONFLICT ("id") DO UPDATE SET "month_cents" = 0, "year_cents" = 0, "students" = NULL, "enabled" = true;
