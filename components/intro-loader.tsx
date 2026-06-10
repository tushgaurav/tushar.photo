"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { categories } from "@/lib/photos"

const INTRO_KEY = "tg-intro-seen"

function preloadImages(srcs: string[]): Promise<void> {
  return new Promise((resolve) => {
    let loaded = 0
    const total = srcs.length
    if (total === 0) return resolve()
    const done = () => {
      loaded += 1
      if (loaded >= total) resolve()
    }
    srcs.forEach((src) => {
      const img = new window.Image()
      img.onload = done
      img.onerror = done
      img.src = src
    })
    // Safety net: never block longer than 6s
    setTimeout(resolve, 6000)
  })
}

export function IntroLoader({ children }: { children: React.ReactNode }) {
  // null = undecided (avoids flash before sessionStorage check)
  const [showIntro, setShowIntro] = useState<boolean | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(INTRO_KEY)) {
      setShowIntro(false)
      setDone(true)
      return
    }
    setShowIntro(true)

    const heroImages = categories.flatMap((c) => c.photos.slice(0, 5).map((p) => p.src))
    const start = Date.now()
    const MIN_DURATION = 1800

    preloadImages(heroImages).then(() => {
      const elapsed = Date.now() - start
      const wait = Math.max(0, MIN_DURATION - elapsed)
      setTimeout(() => {
        sessionStorage.setItem(INTRO_KEY, "1")
        setDone(true)
      }, wait)
    })
  }, [])

  return (
    <>
      <AnimatePresence>
        {showIntro && !done && (
          <motion.div
            key="intro"
            exit={{ y: "-100%" }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-foreground text-background"
            aria-hidden="true"
          >
            <div className="overflow-hidden px-[1vw] pb-[1.5vw]">
              <motion.p
                initial={{ y: "115%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1], delay: 0.15 }}
                className="text-[11vw] leading-none font-extrabold tracking-tighter lowercase md:text-[8vw]"
              >
                tushar gaurav
              </motion.p>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.4, 1] }}
              transition={{ duration: 1.4, delay: 0.5 }}
              className="mt-2 text-xs font-bold tracking-widest md:text-sm"
            >
              {"[ PHOTOGRAPHY ]"}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={{ opacity: done ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {children}
      </motion.div>
    </>
  )
}
