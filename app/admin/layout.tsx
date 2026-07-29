import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { PendingRows } from "@/components/admin/pending-rows"
import { SignOutButton } from "@/components/admin/sign-out-button"
import { requireAdmin } from "@/lib/auth-guard"

export const metadata: Metadata = {
  title: "Admin — tushar.photo",
  robots: { index: false, follow: false },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-svh">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-4 py-4 md:px-10">
        <div className="flex flex-wrap items-center gap-6">
          <Link
            href="/admin"
            className="text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-50"
          >
            Admin
          </Link>
          <nav className="flex items-center gap-5 text-xs font-medium tracking-widest uppercase text-muted-foreground">
            <Link href="/admin/categories" className="hover:text-foreground">
              Collections
            </Link>
            <Link href="/admin/about" className="hover:text-foreground">
              About
            </Link>
            <Link href="/" className="hover:text-foreground">
              View site
            </Link>
          </nav>
        </div>

        {/*
          Reading the session is request-scoped, and Cache Components will not
          let a layout block prerendering on it. Note this boundary means the
          layout does NOT gate `children` — React renders them in parallel — so
          every admin page calls requireAdmin() for itself. See lib/auth-guard.ts.
        */}
        <Suspense fallback={<div className="h-7" />}>
          <AccountControls />
        </Suspense>
      </header>

      {/*
        One boundary for every admin page. The admin reads the session and
        unpublished rows on each request, and Cache Components requires a
        declared fallback above any such read. Putting it here means individual
        pages can await `params` and query freely without each one repeating the
        shell-plus-Suspense dance.
      */}
      <div className="px-4 py-8 md:px-10 md:py-10">
        <Suspense fallback={<PendingRows rows={6} />}>{children}</Suspense>
      </div>
    </div>
  )
}

async function AccountControls() {
  const user = await requireAdmin()

  return (
    <div className="flex items-center gap-4">
      <span className="text-xs text-muted-foreground">{user.email}</span>
      <SignOutButton />
    </div>
  )
}
