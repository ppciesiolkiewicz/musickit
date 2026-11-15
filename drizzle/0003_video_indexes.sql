CREATE INDEX "share_videos_video_id_idx" ON "share_videos" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "videos_user_id_idx" ON "videos" USING btree ("user_id");