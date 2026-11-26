ALTER TABLE "content_videos" ALTER COLUMN "blob_path" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "content_videos" ADD COLUMN "cues" jsonb;