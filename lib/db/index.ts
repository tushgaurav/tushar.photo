import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as authSchema from "./auth-schema"
import * as schema from "./schema"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL is not set")
}

export const fullSchema = { ...schema, ...authSchema }

/**
 * PgBouncer runs in transaction pooling mode, which hands a backend connection
 * back to the pool at COMMIT. Prepared statements are session state, so they
 * would not survive that and would surface as
 * `prepared statement "s1" already exists`. Disabling them is mandatory here,
 * not an optimisation.
 */
/**
 * `sslmode=require` in a connection string encrypts the connection but does not
 * authenticate the server, so it does not protect against a man-in-the-middle.
 * Vercel has no static egress IPs on Hobby, so whatever we connect to has to
 * accept connections from any address — certificate verification is therefore
 * the only thing establishing that we reached the real database.
 *
 * Connecting straight to RDS needs DATABASE_CA_CERT set to the RDS bundle, since
 * Amazon's CA is not in the system trust store. Once PgBouncer fronts it with an
 * ordinary public certificate, leave this unset and put `sslmode=verify-full` in
 * DATABASE_URL instead, which verifies against the system CAs.
 */
const ca = process.env.DATABASE_CA_CERT

const client = postgres(connectionString, {
  prepare: false,
  /**
   * Each serverless invocation gets its own process, so a large per-instance
   * pool multiplies across concurrent invocations without helping throughput.
   * PgBouncer is what actually does the pooling.
   */
  max: process.env.NODE_ENV === "production" ? 1 : 5,
  idle_timeout: 20,
  connect_timeout: 10,
  ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}),
})

export const db = drizzle(client, { schema: fullSchema })

export { schema, authSchema }
