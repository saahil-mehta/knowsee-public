CREATE TABLE "oauth_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"provider" text NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text,
	"tokenExpiry" timestamp,
	"scopes" text,
	"providerEmail" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_join_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"team_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"token" text NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_join_requests_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "team_corpora" ADD COLUMN "email_domain" text;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "oauth_connections_userId_idx" ON "oauth_connections" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_connections_userId_provider_idx" ON "oauth_connections" USING btree ("userId","provider");--> statement-breakpoint
CREATE INDEX "team_join_requests_token_idx" ON "team_join_requests" USING btree ("token");--> statement-breakpoint
CREATE INDEX "team_join_requests_user_id_idx" ON "team_join_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_join_requests_team_id_idx" ON "team_join_requests" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_corpora_email_domain_idx" ON "team_corpora" USING btree ("email_domain");