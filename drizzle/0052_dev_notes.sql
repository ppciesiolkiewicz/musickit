CREATE TABLE "dev_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"note" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dev_notes" ENABLE ROW LEVEL SECURITY;