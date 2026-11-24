CREATE TABLE "reminders" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean NOT NULL,
	"time" text NOT NULL,
	"zone" text NOT NULL,
	"sent_on" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminders_time_quarter" CHECK ("reminders"."time" ~ '^([01][0-9]|2[0-3]):(00|15|30|45)$')
);
--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;