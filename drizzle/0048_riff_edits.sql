ALTER TABLE "blocks" ADD COLUMN "riff_edit" jsonb;--> statement-breakpoint
ALTER TABLE "blocks" ADD COLUMN "riff_edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "blocks" ADD COLUMN "riff_edited_by" uuid;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_riff_edited_by_users_id_fk" FOREIGN KEY ("riff_edited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;