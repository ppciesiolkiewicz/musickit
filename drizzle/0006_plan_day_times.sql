CREATE TABLE "plan_day_times" (
	"user_id" uuid NOT NULL,
	"plan_id" text NOT NULL,
	"day" integer NOT NULL,
	"elapsed" integer NOT NULL,
	"spent" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_day_times_user_id_plan_id_day_pk" PRIMARY KEY("user_id","plan_id","day")
);
--> statement-breakpoint
ALTER TABLE "plan_day_times" ADD CONSTRAINT "plan_day_times_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;