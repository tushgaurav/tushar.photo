"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"

const ease = [0.32, 0.72, 0, 1] as const

type TransitionState = {
  navigate: (href: string, label?: string) => void
}

const TransitionContext = createContext<TransitionState>({
  navigate: () => {},
})

export function usePageTransition() {
  return useContext(TransitionContext)
}

export function PageTransitionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [overlay, setOverlay] = useState<{ label?: string } | null>(null)
  const pendingHref = useRef<string | null>(null)

  const navigate = useCallback(
    (href: string, label?: string) => {
      if (href === pathname) return
      pendingHref.current = href
      setOverlay({ label })
      // Push after the cover animation has hidden the page
      setTimeout(() => {
        router.push(href)
      }, 520)
    },
    [router, pathname],
  )

  // When the route actually changes, lift the overlay
  useEffect(() => {
    if (pendingHref.current && pathname === pendingHref.current) {
      pendingHref.current = null
      const t = setTimeout(() => setOverlay(null), 250)
      return () => clearTimeout(t)
    }
  }, [pathname])

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      <AnimatePresence>
        {overlay ? (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.55, ease }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground"
            aria-hidden="true"
          >
            {overlay.label ? (
              <motion.span
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease }}
                className="text-[10vw] font-extrabold tracking-tighter lowercase text-background md:text-[7vw]"
              >
                {overlay.label}
              </motion.span>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </TransitionContext.Provider>
  )
}

export function TransitionLink({
  href,
  label,
  children,
  className,
  ...rest
}: {
  href: string
  label?: string
  children: React.ReactNode
  className?: string
} & Omit<React.ComponentProps<typeof Link>, "href">) {
  const { navigate } = usePageTransition()
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        // Allow modified clicks (new tab etc.) to behave natively
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        navigate(href, label)
      }}
      {...rest}
    >
      {children}
    </Link>
  )
}
