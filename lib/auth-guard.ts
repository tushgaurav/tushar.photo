import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "./auth"

/**
 * Validates the session against the database and returns the user.
 *
 * This — not `proxy.ts` — is the authorisation boundary. The proxy only checks
 * that a session cookie exists, which is trivially forgeable. Every admin page
 * and every mutating server action must call this.
 */
export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/sign-in")
  }

  return session.user
}

/** Non-redirecting variant, for deciding whether to show an "edit" affordance. */
export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}
