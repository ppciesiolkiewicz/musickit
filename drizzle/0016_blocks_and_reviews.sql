CREATE TYPE "public"."block_source" AS ENUM('ai', 'edit', 'seed', 'example');--> statement-breakpoint
CREATE TABLE "block_owners" (
	"user_id" uuid,
	"block_id" text NOT NULL,
	"source" "block_source" NOT NULL,
	"enabled_for_reuse" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "block_owners_user_block" UNIQUE NULLS NOT DISTINCT("user_id","block_id")
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"content" jsonb NOT NULL,
	"area" text,
	"topic" text,
	"concepts" text[] DEFAULT '{}'::text[] NOT NULL,
	"level" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"parent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_reviews" (
	"user_id" uuid NOT NULL,
	"plan_id" text NOT NULL,
	"library_plan_id" text,
	"title" text NOT NULL,
	"stars" integer NOT NULL,
	"why" text,
	"at" timestamp with time zone NOT NULL,
	CONSTRAINT "plan_reviews_stars_range" CHECK ("plan_reviews"."stars" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "plan_day_times" ADD COLUMN "blocks" jsonb;--> statement-breakpoint
ALTER TABLE "plan_day_times" ADD COLUMN "on_dates" jsonb;--> statement-breakpoint
ALTER TABLE "progress_entries" ADD COLUMN "block_id" text;--> statement-breakpoint
ALTER TABLE "block_owners" ADD CONSTRAINT "block_owners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_owners" ADD CONSTRAINT "block_owners_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_reviews" ADD CONSTRAINT "plan_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_reviews" ADD CONSTRAINT "plan_reviews_library_plan_id_practice_plans_id_fk" FOREIGN KEY ("library_plan_id") REFERENCES "public"."practice_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "block_owners_block" ON "block_owners" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "blocks_area" ON "blocks" USING btree ("area");--> statement-breakpoint
CREATE INDEX "blocks_topic" ON "blocks" USING btree ("topic");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_reviews_user_plan" ON "plan_reviews" USING btree ("user_id","plan_id");--> statement-breakpoint
CREATE INDEX "plan_reviews_at" ON "plan_reviews" USING btree ("at");--> statement-breakpoint
CREATE INDEX "progress_entries_block" ON "progress_entries" USING btree ("block_id");