"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion"

const LABELS: Record<string, string> = {
  view: "[ VIEW ]",
  prev: "[ PREV ]",
  next: "[ NEXT ]",
  close: "[ CLOSE ]",
  open: "[ OPEN ]",
}

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false)
  const [label, setLabel] = useState<string | null>(null)
  const [pressed, setPressed] = useState(false)

  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const springX = useSpring(x, { stiffness: 500, damping: 40, mass: 0.6 })
  const springY = useSpring(y, { stiffness: 500, damping: 40, mass: 0.6 })

  useEffect(() => {
    // Only on fine pointers (desktop)
    const mq = window.matchMedia("(pointer: fine)")
    if (!mq.matches) return
    setEnabled(true)

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)

      const target = e.target as HTMLElement | null
      const cursorEl = target?.closest?.("[data-cursor]") as HTMLElement | null
      setLabel(cursorEl?.dataset.cursor ?? null)
    }
    const onDown = () => setPressed(true)
    const onUp = () => setPressed(false)

    window.addEventListener("mousemove", onMove, { passive: true })
    window.addEventListener("mousedown", onDown)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("mouseup", onUp)
    }
  }, [x, y])

  if (!enabled) return null

  const text = label ? LABELS[label] : null

  return (
    <motion.div
      aria-hidden="true"
      style={{ x: springX, y: springY }}
      className="pointer-events-none fixed top-0 left-0 z-[100] hidden -translate-x-1/2 -translate-y-1/2 mix-blend-difference md:block"
    >
      {/*
        Only the contextual labels follow the pointer. There is deliberately no
        idle dot: it tracked into text inputs across the admin forms, and the
        native cursor is never hidden, so nothing needs to stand in for it.
      */}
      <AnimatePresence mode="wait">
        {text ? (
          <motion.span
            key={text}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: pressed ? 0.9 : 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="block -translate-x-1/2 -translate-y-1/2 text-xs font-bold tracking-widest whitespace-nowrap text-white"
          >
            {text}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}
