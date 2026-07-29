import type { Metadata } from "next"
import Image from "next/image"
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
  /*
   * The root layout insets every page by the body's frame padding, which the
   * public site uses as a border. Admin is a full-bleed app UI, and that inset
   * otherwise stacks on top of the header's own py-4 (reading as lopsided
   * padding) and leaves the sticky header sitting below the viewport edge until
   * it snaps flush on scroll. The negative margin cancels it exactly, so the
   * page still totals 100svh.
   */
  return (
    <div className="-m-1.5 min-h-svh md:-m-2.5">
      {/* Needs an opaque background: content scrolls underneath it. */}
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-4 py-4 md:px-10">
        <div className="flex flex-wrap items-center gap-6">
          <Link
            href="/admin"
            aria-label="Admin home"
            className="transition-opacity hover:opacity-50"
          >
            <Image
              src="/tushar-sign-black.jpg"
              alt="Tushar Gaurav"
              width={420}
              height={100}
              priority
              /*
               * The signature is a JPEG, so its ground is white while the header
               * is a warm grey. Multiply blends the white away and leaves the
               * strokes; this relies on the admin always being light-themed.
               */
              className="h-6 w-auto mix-blend-multiply"
            />
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
