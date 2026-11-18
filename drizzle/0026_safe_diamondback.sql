CREATE TABLE "message_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text DEFAULT 'support' NOT NULL,
	"user_id" uuid,
	"email" text,
	"status" text DEFAULT 'open' NOT NULL,
	"last_at" timestamp with time zone NOT NULL,
	"last_user_at" timestamp with time zone,
	"last_admin_at" timestamp with time zone,
	"user_read_at" timestamp with time zone,
	"admin_read_at" timestamp with time zone,
	"emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_threads_status_value" CHECK ("message_threads"."status" in ('open', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"from_admin" boolean NOT NULL,
	"body" text NOT NULL,
	"context" jsonb,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_threads_user" ON "message_threads" USING btree ("user_id","last_at");--> statement-breakpoint
CREATE INDEX "message_threads_status" ON "message_threads" USING btree ("status","last_at");--> statement-breakpoint
CREATE INDEX "messages_thread" ON "messages" USING btree ("thread_id","at");