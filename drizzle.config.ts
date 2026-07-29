import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

// Next.js reads .env.local automatically; drizzle-kit does not, so load the
// same file here rather than maintaining a second copy of the credentials.
config({ path: ".env.local", quiet: true })

/**
 * Migrations must bypass PgBouncer. drizzle-kit takes advisory locks and runs
 * multi-statement DDL that assumes a stable session, neither of which survives
 * transaction-mode pooling. DIRECT_DATABASE_URL points straight at Postgres.
 */
const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL

if (!url) {
  throw new Error("Set DIRECT_DATABASE_URL (preferred) or DATABASE_URL")
}

export default defineConfig({
  schema: ["./lib/db/schema.ts", "./lib/db/auth-schema.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
