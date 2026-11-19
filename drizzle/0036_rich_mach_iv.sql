CREATE TABLE "choices" (
	"id" text PRIMARY KEY NOT NULL,
	"block_id" text NOT NULL,
	"name" text NOT NULL,
	"level" text,
	"steps" text[] DEFAULT '{}'::text[] NOT NULL,
	"moves" jsonb,
	"set" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"minutes" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"place" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "choices_block_name" UNIQUE("block_id","name")
);
--> statement-breakpoint
ALTER TABLE "blocks" ADD COLUMN "kind" text DEFAULT 'hashed' NOT NULL;--> statement-breakpoint
ALTER TABLE "practice_plan_blocks" ADD COLUMN "choice_id" text;--> statement-breakpoint
ALTER TABLE "progress_entries" ADD COLUMN "choice_id" text;--> statement-breakpoint
ALTER TABLE "choices" ADD CONSTRAINT "choices_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "choices_block" ON "choices" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "choices_active" ON "choices" USING btree ("active");--> statement-breakpoint
ALTER TABLE "practice_plan_blocks" ADD CONSTRAINT "practice_plan_blocks_choice_id_choices_id_fk" FOREIGN KEY ("choice_id") REFERENCES "public"."choices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "progress_entries_choice" ON "progress_entries" USING btree ("choice_id");