import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { SignInForm } from "@/components/admin/sign-in-form"
import { getCurrentUser } from "@/lib/auth-guard"

export const metadata: Metadata = {
  title: "Sign in",
  // Keep the admin entrance out of search results.
  robots: { index: false, follow: false },
}

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
            tushar.photo
          </p>
          <h1 className="mt-3 text-4xl leading-[0.9] font-extrabold tracking-tighter lowercase md:text-5xl">
            sign in
          </h1>
        </header>

        {/*
          The form itself is static and can be prerendered. Reading the session
          is request-scoped, so it goes behind its own boundary — otherwise Cache
          Components would hold the whole page back waiting on it.
        */}
        <Suspense fallback={<SignInForm next="/admin" />}>
          <SignInGate searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  )
}

async function SignInGate({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const target = safeNext(next)
  const user = await getCurrentUser()

  if (user) {
    redirect(target)
  }

  return <SignInForm next={target} />
}

/**
 * Only allow same-site relative paths. Echoing an arbitrary `next` value into a
 * redirect would turn this page into an open redirect that an attacker could
 * use to bounce victims to another origin from a trusted-looking link.
 */
function safeNext(value: string | undefined): string {
  if (!value) return "/admin"
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin"
  return value
}
