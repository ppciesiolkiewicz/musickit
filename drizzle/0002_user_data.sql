CREATE TYPE "public"."share_kind" AS ENUM('note', 'plan');--> statement-breakpoint
CREATE TABLE "plan_claims" (
	"share_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_claims_share_id_user_id_pk" PRIMARY KEY("share_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "progress_entries" (
	"user_id" uuid NOT NULL,
	"exercise_id" text NOT NULL,
	"entry" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_videos" (
	"share_id" text NOT NULL,
	"video_id" uuid NOT NULL,
	CONSTRAINT "share_videos_share_id_video_id_pk" PRIMARY KEY("share_id","video_id")
);
--> statement-breakpoint
CREATE TABLE "shares" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "share_kind" NOT NULL,
	"item_id" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stopped_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_documents" (
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"seconds" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size" bigint NOT NULL,
	"blob_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "videos_blob_path_unique" UNIQUE("blob_path")
);
--> statement-breakpoint
ALTER TABLE "plan_claims" ADD CONSTRAINT "plan_claims_share_id_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."shares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_claims" ADD CONSTRAINT "plan_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_entries" ADD CONSTRAINT "progress_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_videos" ADD CONSTRAINT "share_videos_share_id_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."shares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_videos" ADD CONSTRAINT "share_videos_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "progress_entries_user_exercise" ON "progress_entries" USING btree ("user_id","exercise_id");--> statement-breakpoint
CREATE INDEX "shares_user_kind_item" ON "shares" USING btree ("user_id","kind","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_documents_user_kind" ON "user_documents" USING btree ("user_id","kind");