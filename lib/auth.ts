import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"

import { db, fullSchema } from "./db"

const productionUrl = "https://tushar.photo"

export const auth = betterAuth({
  appName: "tushar.photo",
  database: drizzleAdapter(db, { provider: "pg", schema: fullSchema }),

  emailAndPassword: {
    enabled: true,
    /**
     * This is a single-operator site. Leaving public registration open would
     * let anyone create an account, and any account can reach /admin. The one
     * account is created out-of-band by `pnpm db:seed-admin`.
     */
    disableSignUp: true,
    minPasswordLength: 12,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },

  // Rejects auth requests whose Origin is not one of these, which is what stops
  // a third-party page from driving the auth endpoints with the user's cookies.
  // VERCEL_URL is the deployment's own hostname, so adding it lets preview
  // deployments authenticate without widening this to all of *.vercel.app.
  trustedOrigins: [
    productionUrl,
    "http://localhost:3000",
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
    storage: "database",
  },

  /**
   * Lets Better Auth set cookies from inside server actions, which is how the
   * sign-in form establishes a session without a client-side fetch.
   * Must be last in the plugin list.
   */
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
export type SessionUser = Session["user"]
