"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

/**
 * Shared motion primitives for the checkout prototype.
 *
 * Every primitive checks `useReducedMotion()` and, when the user prefers
 * reduced motion, drops all transforms and stagger — keeping only a minimal
 * opacity transition (or nothing). No animation is required to understand the
 * page, and nothing loops.
 */

const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** Fade + optional scale/translate on initial mount (used for the hero). */
export function LoadReveal({
  children,
  className,
  y = 10,
  scale,
  delay = 0,
  duration = 0.6,
}: {
  children: ReactNode
  className?: string
  y?: number
  scale?: number
  delay?: number
  duration?: number
}) {
  const reduce = useReducedMotion()
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, y, ...(scale ? { scale } : {}) }
  const shown = reduce ? { opacity: 1 } : { opacity: 1, y: 0, ...(scale ? { scale: 1 } : {}) }
  return (
    <motion.div className={className} initial={hidden} animate={shown} transition={{ duration, delay, ease: EASE_OUT }}>
      {children}
    </motion.div>
  )
}

/** Fade + slight rise the first time the block scrolls into view. Runs once. */
export function ViewReveal({
  children,
  className,
  y = 10,
  delay = 0,
  duration = 0.5,
}: {
  children: ReactNode
  className?: string
  y?: number
  delay?: number
  duration?: number
}) {
  const reduce = useReducedMotion()
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, y }
  const shown = reduce ? { opacity: 1 } : { opacity: 1, y: 0 }
  return (
    <motion.div
      className={className}
      initial={hidden}
      whileInView={shown}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}

/** Container that staggers its <StaggerItem> children once on view entry. */
export function StaggerGroup({
  children,
  className,
  stagger = 0.07,
  delayChildren = 0,
}: {
  children: ReactNode
  className?: string
  stagger?: number
  delayChildren?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.5 }}
      variants={{
        hidden: {},
        show: { transition: reduce ? {} : { staggerChildren: stagger, delayChildren } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className, y = 8 }: { children: ReactNode; className?: string; y?: number }) {
  const reduce = useReducedMotion()
  const variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.3 } } }
    : { hidden: { opacity: 0, y }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } } }
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  )
}
