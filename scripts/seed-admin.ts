/**
 * Creates the single admin account.
 *
 *   pnpm db:seed-admin
 *
 * Public sign-up is disabled in lib/auth.ts, so this script is the only way an
 * account comes into existence.
 *
 * To replace the password of an existing account, re-run with ADMIN_FORCE_RESET=1.
 * That deletes the account and recreates it, which also invalidates every
 * existing session via the ON DELETE CASCADE on session.user_id.
 */
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { eq } from "drizzle-orm"

import { db, fullSchema } from "../lib/db"
import { user } from "../lib/db/auth-schema"

/**
 * A parallel Better Auth instance with registration enabled.
 *
 * Going through the public signUpEmail endpoint means password hashing and
 * account linking are handled by the library exactly as they would be at
 * runtime. The alternative — writing to internalAdapter directly — depends on
 * unstable internals and risks producing a row that cannot actually sign in.
 */
const seedAuth = betterAuth({
  appName: "tushar.photo",
  database: drizzleAdapter(db, { provider: "pg", schema: fullSchema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    minPasswordLength: 12,
  },
})

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME ?? "Admin"
  const force = process.env.ADMIN_FORCE_RESET === "1"

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local")
  }

  if (password.length < 12) {
    throw new Error(
      "ADMIN_PASSWORD must be at least 12 characters (matches minPasswordLength in lib/auth.ts)",
    )
  }

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1)

  if (existing.length > 0) {
    if (!force) {
      console.log(`Admin already exists: ${email}`)
      console.log("Re-run with ADMIN_FORCE_RESET=1 to reset the password.")
      return
    }

    // Cascades to session and account rows.
    await db.delete(user).where(eq(user.id, existing[0].id))
    console.log(`Deleted existing account for ${email}`)
  }

  await seedAuth.api.signUpEmail({
    body: { email, password, name },
  })

  // signUpEmail leaves emailVerified false. There is no verification mailer
  // configured (and only one known operator), so mark it verified rather than
  // leaving the account in a state that could block sign-in later.
  await db
    .update(user)
    .set({ emailVerified: true })
    .where(eq(user.email, email))

  console.log(`Created admin: ${email}`)
  console.log("Sign in at /sign-in")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
