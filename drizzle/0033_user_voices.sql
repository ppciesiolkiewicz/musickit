CREATE TABLE "user_voices" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"type" text,
	"low" integer,
	"high" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_voices_type_or_range" CHECK (("user_voices"."type" is not null and "user_voices"."low" is null and "user_voices"."high" is null) or ("user_voices"."type" is null and "user_voices"."low" is not null and "user_voices"."high" is not null and "user_voices"."low" < "user_voices"."high"))
);
--> statement-breakpoint
ALTER TABLE "user_voices" ADD CONSTRAINT "user_voices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;