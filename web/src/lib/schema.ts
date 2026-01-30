/**
 * Drizzle schema for Better Auth tables.
 *
 * Schema derived from local SQLite auth.db to ensure compatibility.
 * Better Auth requires these tables for authentication.
 */

import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  integer,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  twoFactorEnabled: boolean("twoFactorEnabled"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const twoFactor = pgTable(
  "twoFactor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backupCodes").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("twoFactor_secret_idx").on(table.secret),
    index("twoFactor_userId_idx").on(table.userId),
  ],
);

// =============================================================================
// OAuth Connections - Third-party service tokens (separate from app auth)
// =============================================================================

/**
 * OAuth connections for external services.
 * Stores tokens for Google Drive, etc.
 */
export const oauthConnections = pgTable(
  "oauth_connections",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'google_drive', etc.
    accessToken: text("accessToken").notNull(),
    refreshToken: text("refreshToken"),
    tokenExpiry: timestamp("tokenExpiry"),
    scopes: text("scopes"), // Space-separated list of granted scopes
    providerEmail: text("providerEmail"), // Email of connected account (for display)
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    index("oauth_connections_userId_idx").on(table.userId),
    uniqueIndex("oauth_connections_userId_provider_idx").on(table.userId, table.provider),
  ],
);

// =============================================================================
// RAG Tables - Team-based corpus access control
// =============================================================================

/**
 * Team corpora registry.
 * Maps teams to their Vertex AI RAG corpora.
 */
export const teamCorpora = pgTable(
  "team_corpora",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull().unique(),
    corpusName: text("corpus_name").notNull(),
    sourceType: text("source_type").notNull(), // 'gdrive'
    folderUrl: text("folder_url").notNull(),
    emailDomain: text("email_domain"), // Organisation domain (e.g. 'knowsee.co.uk')
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastSyncStatus: text("last_sync_status"), // 'pending' | 'in_progress' | 'completed' | 'failed'
    fileCount: integer("file_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("team_corpora_team_id_idx").on(table.teamId),
    index("team_corpora_email_domain_idx").on(table.emailDomain),
  ],
);

/**
 * User team membership.
 * Used when Better Auth is the identity provider.
 */
export const userTeams = pgTable(
  "user_teams",
  {
    userId: text("user_id").notNull(),
    teamId: text("team_id").notNull(),
    role: text("role").default("member"), // 'member' | 'admin'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.teamId] }),
    index("user_teams_user_id_idx").on(table.userId),
    index("user_teams_team_id_idx").on(table.teamId),
  ],
);

// =============================================================================
// Feedback Table
// =============================================================================

/**
 * User feedback submissions.
 * Stores categorised feedback from authenticated users.
 */
export const feedback = pgTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    category: text("category").notNull(), // 'bug' | 'feature_request' | 'question' | 'other'
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("feedback_user_id_idx").on(table.userId),
    index("feedback_created_at_idx").on(table.createdAt),
  ],
);

// =============================================================================
// Team Join Requests
// =============================================================================

/**
 * Team join requests.
 * Self-service team membership with admin approval via email.
 */
export const teamJoinRequests = pgTable(
  "team_join_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(), // Requesting user's email (lowercase)
    teamId: text("team_id").notNull(), // Domain-prefixed team ID
    status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected' | 'expired'
    token: text("token").notNull().unique(), // UUID v4 for email links
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
    decidedBy: text("decided_by"), // Admin email who approved/rejected
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("team_join_requests_token_idx").on(table.token),
    index("team_join_requests_user_id_idx").on(table.userId),
    index("team_join_requests_team_id_idx").on(table.teamId),
  ],
);
