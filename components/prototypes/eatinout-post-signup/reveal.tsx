"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { CSSProperties, ReactNode } from "react"

/**
 * Isolated one-time reveal primitive for the post-signup success demo.
 *
 * `mode="load"` animates on mount; `mode="view"` animates the first time the
 * block scrolls into view. Every animation runs once and nothing loops. When
 * the user prefers reduced motion, all transforms and stagger are dropped and
 * only a minimal opacity transition remains.
 */

const EASE_OUT = [0.22, 1, 0.36, 1] as const

export function Reveal({
  children,
  className,
  style,
  mode = "view",
  y = 10,
  scale,
  duration = 0.5,
  delay = 0,
  amount = 0.3,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  mode?: "load" | "view"
  y?: number
  scale?: number
  duration?: number
  delay?: number
  amount?: number
}) {
  const reduce = useReducedMotion()

  const hidden = reduce ? { opacity: 0 } : { opacity: 0, y, ...(scale ? { scale } : {}) }
  const shown = reduce ? { opacity: 1 } : { opacity: 1, y: 0, ...(scale ? { scale: 1 } : {}) }
  const transition = { duration: reduce ? 0.2 : duration, delay: reduce ? 0 : delay, ease: EASE_OUT }

  if (mode === "load") {
    return (
      <motion.div className={className} style={style} initial={hidden} animate={shown} transition={transition}>
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial={hidden}
      whileInView={shown}
      viewport={{ once: true, amount }}
      transition={transition}
    >
      {children}
    </motion.div>
  )
}
