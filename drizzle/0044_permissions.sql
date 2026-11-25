ALTER TABLE "users" ADD COLUMN "permissions" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
UPDATE "users" SET "permissions" = '{dev,content,admin}', "role" = COALESCE((SELECT "plans"."role" FROM "plans" WHERE "plans"."id" = "users"."plan_id"), 'student') WHERE "role" = 'admin';--> statement-breakpoint
UPDATE "auth_tokens" SET "role" = NULL WHERE "role" = 'admin';--> statement-breakpoint
ALTER TABLE "auth_tokens" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'teacher', 'owner');--> statement-breakpoint
ALTER TABLE "auth_tokens" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_permissions_known" CHECK ("users"."permissions" <@ array['dev','content','admin']::text[]);
