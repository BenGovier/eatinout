"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface RevealProps {
  children: ReactNode
  /** Stagger delay in seconds */
  delay?: number
  className?: string
  /** Vertical offset to animate from */
  y?: number
}

/**
 * Lightweight scroll-reveal wrapper for the /prestonblog landing page.
 * Soft fade + rise, runs once when the element enters the viewport.
 * Respects reduced-motion via Framer Motion's built-in handling.
 */
export function Reveal({ children, delay = 0, className, y = 24 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
