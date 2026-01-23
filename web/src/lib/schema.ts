/**
 * Drizzle schema for Better Auth tables.
 *
 * Schema derived from local SQLite auth.db to ensure compatibility.
 * Better Auth requires these tables for authentication.
 */

import { pgTable, text, timestamp, boolean, index, integer, primaryKey } from "drizzle-orm/pg-core";

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
    sourceType: text("source_type").notNull(), // 'gdrive' | 'onedrive'
    folderUrl: text("folder_url").notNull(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastSyncStatus: text("last_sync_status"), // 'pending' | 'in_progress' | 'completed' | 'failed'
    fileCount: integer("file_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("team_corpora_team_id_idx").on(table.teamId)],
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
