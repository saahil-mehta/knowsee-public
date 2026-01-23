CREATE TABLE "team_corpora" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"corpus_name" text NOT NULL,
	"source_type" text NOT NULL,
	"folder_url" text NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_sync_status" text,
	"file_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_corpora_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
CREATE TABLE "user_teams" (
	"user_id" text NOT NULL,
	"team_id" text NOT NULL,
	"role" text DEFAULT 'member',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_teams_user_id_team_id_pk" PRIMARY KEY("user_id","team_id")
);
--> statement-breakpoint
CREATE INDEX "team_corpora_team_id_idx" ON "team_corpora" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "user_teams_user_id_idx" ON "user_teams" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_teams_team_id_idx" ON "user_teams" USING btree ("team_id");