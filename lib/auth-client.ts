"use client"

import { createAuthClient } from "better-auth/react"

// No baseURL: the admin UI is always served from the same origin as the auth
// route handler, so the client's default (current origin) is what we want.
export const authClient = createAuthClient()

export const { signIn, signOut, useSession, getSession } = authClient
