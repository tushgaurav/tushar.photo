"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"

import type { Category } from "@/lib/content"
import { NAV_LINKS } from "@/lib/nav"
import { usePageTransition } from "@/components/page-transition"

const ease = [0.32, 0.72, 0, 1] as const

export type MenuCollection = Pick<Category, "slug" | "name" | "index">

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

export function SiteMenu({
  collections = [],
  className = "",
  onOpenChange,
}: {
  collections?: MenuCollection[]
  /** Positions the trigger; the overlay itself is always full-bleed. */
  className?: string
  onOpenChange?: (open: boolean) => void
}) {
  const pathname = usePathname()
  const { navigate } = usePageTransition()
  const [open, setOpen] = useState(false)
  /**
   * The panel and the page-transition cover are both `bg-foreground`, so a
   * navigation hand-off is seamless only if the panel disappears while the
   * cover is fully drawn. Animating it out then would part the two and flash
   * the page underneath, so navigation unmounts it instantly instead.
   */
  const [leaveInstantly, setLeaveInstantly] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Held in a ref so `setOpenState` stays stable: an inline callback from the
  // parent would otherwise re-run the effects below on every render.
  const onOpenChangeRef = useRef(onOpenChange)
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  const setOpenState = useCallback((next: boolean) => {
    setOpen(next)
    onOpenChangeRef.current?.(next)
  }, [])

  const close = useCallback(() => {
    setLeaveInstantly(false)
    setOpenState(false)
  }, [setOpenState])

  const go = useCallback(
    (href: string, label: string) => {
      if (href === pathname) {
        close()
        return
      }
      setLeaveInstantly(true)
      navigate(href, label)
    },
    [pathname, navigate, close],
  )

  const onItemClick =
    (href: string, label: string) => (e: React.MouseEvent) => {
      // Allow modified clicks (new tab etc.) to behave natively
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      go(href, label)
    }

  // The cover is in place by the time the route changes, so drop the panel then.
  useEffect(() => {
    setOpenState(false)
  }, [pathname, setOpenState])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, close])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenState(true)}
        data-cursor="open"
        aria-expanded={open}
        className={`text-xs font-bold tracking-widest transition-opacity hover:opacity-50 md:text-sm ${className}`}
      >
        {"[ MENU ]"}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{
              y: "100%",
              transition: { duration: leaveInstantly ? 0 : 0.5, ease },
            }}
            transition={{ duration: 0.55, ease }}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="fixed inset-0 z-[95] flex flex-col bg-foreground text-background"
          >
            <div className="flex items-center justify-between px-4 py-4 md:px-8 md:py-6">
              <span className="text-xs font-bold tracking-widest md:text-sm">
                {"[ MENU ]"}
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                data-cursor="close"
                className="text-xs font-bold tracking-widest transition-opacity hover:opacity-50 md:text-sm"
              >
                {"[ CLOSE ]"}
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-8 md:px-8 md:py-10">
              {/*
                `mt-auto` rather than `justify-end` so the block stays bottom
                anchored without clipping its own top once it overflows.
              */}
              <div className="mt-auto grid w-full grid-cols-1 gap-10 md:grid-cols-5 md:items-end md:gap-12">
                <nav className="md:col-span-3">
                  {NAV_LINKS.map((link, i) => {
                    const isCurrent = pathname === link.href
                    return (
                      // The mask needs room for descenders, or `gear` gets cut.
                      <div
                        key={link.href}
                        className="overflow-hidden px-[0.08em] pb-[0.14em]"
                      >
                        <motion.div
                          initial={{ y: "115%" }}
                          animate={{ y: 0 }}
                          transition={{
                            duration: 0.6,
                            delay: 0.12 + i * 0.06,
                            ease,
                          }}
                        >
                          <Link
                            href={link.href}
                            aria-current={isCurrent ? "page" : undefined}
                            onClick={onItemClick(link.href, link.label)}
                            className={`block text-[15vw] leading-none font-extrabold tracking-tighter lowercase transition-opacity md:text-[8vw] ${
                              isCurrent
                                ? "opacity-30 hover:opacity-50"
                                : "hover:opacity-60"
                            }`}
                          >
                            {link.label}
                          </Link>
                        </motion.div>
                      </div>
                    )
                  })}
                </nav>

                {collections.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3, ease }}
                    className="flex flex-col gap-4 md:col-span-2 md:pb-[1vw]"
                  >
                    <p className="text-xs font-bold tracking-widest opacity-50">
                      COLLECTIONS
                    </p>
                    <ul className="flex flex-col gap-3">
                      {collections.map((collection) => {
                        const href = `/${collection.slug}`
                        const isCurrent = pathname === href
                        return (
                          <li key={collection.slug}>
                            <Link
                              href={href}
                              aria-current={isCurrent ? "page" : undefined}
                              onClick={onItemClick(href, collection.name)}
                              className={`flex items-baseline gap-4 text-xs font-bold tracking-widest uppercase transition-opacity md:text-sm ${
                                isCurrent
                                  ? "opacity-30 hover:opacity-50"
                                  : "hover:opacity-60"
                              }`}
                            >
                              <span className="font-medium opacity-50">
                                {`[${pad(collection.index)}]`}
                              </span>
                              {collection.name}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </motion.div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-4 md:px-8 md:py-6">
              <span className="text-xs font-bold tracking-widest md:text-sm">
                TUSHAR
              </span>
              <span className="text-xs font-bold tracking-widest md:text-sm">
                GAURAV
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
