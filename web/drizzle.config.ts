import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration for database migrations.
 *
 * Usage:
 *   npx drizzle-kit generate   # Generate migration files
 *   npx drizzle-kit migrate    # Run migrations (requires DATABASE_URL)
 *   npx drizzle-kit push       # Push schema directly (dev only)
 *
 * For Cloud SQL, run migrations via Cloud SQL Auth Proxy:
 *   cloud-sql-proxy your-project-id:europe-west1:knowsee-db-dev &
 *   DATABASE_URL="postgresql://knowsee:password@localhost:5432/knowsee" npx drizzle-kit migrate
 */
export default defineConfig({
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
