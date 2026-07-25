"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { PrestonCtaButton } from "./preston-cta-button"

/**
 * Mobile-only sticky CTA. Appears after the visitor scrolls past the hero
 * so the primary action is always one tap away.
 */
export function PrestonStickyCta() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 520)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-x-0 bottom-0 z-50 border-t border-black/5 bg-white/90 p-3 backdrop-blur-md sm:hidden"
        >
          <PrestonCtaButton block />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
