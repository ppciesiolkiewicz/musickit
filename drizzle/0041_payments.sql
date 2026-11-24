CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text,
	"plan_id" text,
	"billing" "plan_period",
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"reason" text,
	"number" text,
	"invoice_url" text,
	"paid_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_user" ON "payments" USING btree ("user_id");