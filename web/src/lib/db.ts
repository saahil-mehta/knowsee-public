/**
 * Database connection module for PostgreSQL.
 *
 * Used in both development (local Docker Postgres) and production (Cloud SQL).
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/**
 * Parse Cloud SQL socket URL into connection options.
 *
 * Cloud SQL URLs use a non-standard format that JavaScript's URL parser rejects:
 *   postgresql://user:pass@/dbname?host=/cloudsql/project:region:instance
 *
 * The missing hostname between @ and / causes URL parsing to fail.
 * We extract components manually and pass them as options to postgres().
 *
 * Returns null for standard URLs (which can be passed directly to postgres()).
 */
function parseCloudSqlUrl(url: string): postgres.Options<Record<string, never>> | null {
  // Match: postgresql://user:pass@/dbname?host=/cloudsql/...
  const match = url.match(/^postgresql:\/\/([^:]+):([^@]+)@\/([^?]+)\?host=(.+)$/);

  if (match) {
    const [, username, password, database, host] = match;
    return {
      host,
      database,
      username,
      password: decodeURIComponent(password),
    };
  }

  // Standard URL format - return null to signal direct usage
  return null;
}

/**
 * Create PostgreSQL connection.
 * Handles both standard URLs (local/TCP) and Cloud SQL socket URLs.
 */
export function createPostgresDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for PostgreSQL connection");
  }

  const cloudSqlOptions = parseCloudSqlUrl(connectionString);

  // Cloud SQL socket URL - use parsed options
  if (cloudSqlOptions) {
    const client = postgres(cloudSqlOptions);
    return drizzle(client);
  }

  // Standard URL (local development) - pass URL directly
  const client = postgres(connectionString);
  return drizzle(client);
}
