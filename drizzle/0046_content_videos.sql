CREATE TABLE "content_videos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"recorded_by" uuid,
	"made_for" text NOT NULL,
	"tool" text,
	"steps" text[],
	"type" text NOT NULL,
	"seconds" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size" bigint NOT NULL,
	"blob_path" text NOT NULL,
	"overlay" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_videos_blob_path_unique" UNIQUE("blob_path")
);
--> statement-breakpoint
ALTER TABLE "content_videos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blocks" ADD COLUMN "videos" jsonb;--> statement-breakpoint
ALTER TABLE "content_videos" ADD CONSTRAINT "content_videos_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_videos_tool_idx" ON "content_videos" USING btree ("tool");