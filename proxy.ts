import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`.
 *
 * This is an optimistic redirect only. `getSessionCookie` checks that a session
 * cookie is present; it does not validate the signature, so a hand-crafted
 * cookie gets past it. The real authorisation check lives in
 * `app/admin/layout.tsx` and is repeated in every server action. Doing it here
 * as well just avoids rendering the admin shell for obviously-anonymous
 * visitors, without paying for a database round trip on every request.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url)
    signInUrl.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
