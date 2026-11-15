CREATE TABLE "practice_plan_blocks" (
	"plan_id" text NOT NULL,
	"day" integer NOT NULL,
	"place" integer NOT NULL,
	"block_id" text NOT NULL,
	"minutes" integer NOT NULL,
	CONSTRAINT "practice_plan_blocks_plan_id_day_place_pk" PRIMARY KEY("plan_id","day","place")
);
--> statement-breakpoint
ALTER TABLE "blocks" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "blocks" ADD COLUMN "prompt_version" integer;--> statement-breakpoint
ALTER TABLE "blocks" ADD COLUMN "docs_agents" integer;--> statement-breakpoint
ALTER TABLE "blocks" ADD COLUMN "docs_teaching" integer;--> statement-breakpoint
ALTER TABLE "practice_plans" ADD COLUMN "prompt_version" integer;--> statement-breakpoint
ALTER TABLE "practice_plans" ADD COLUMN "docs_agents" integer;--> statement-breakpoint
ALTER TABLE "practice_plans" ADD COLUMN "docs_teaching" integer;--> statement-breakpoint
ALTER TABLE "practice_plan_blocks" ADD CONSTRAINT "practice_plan_blocks_plan_id_practice_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."practice_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_plan_blocks" ADD CONSTRAINT "practice_plan_blocks_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "practice_plan_blocks_block" ON "practice_plan_blocks" USING btree ("block_id");