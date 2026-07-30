"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PrestonCtaButtonProps {
  /** Where the CTA points. Trial CTAs use the existing /sign-up flow. */
  href?: string
  label?: string
  className?: string
  /** Full-width on mobile */
  block?: boolean
  /** Visual style. primary = brand red, secondary = outline for over-image use */
  variant?: "primary" | "secondary"
  /** Show the trailing arrow (primary only by default) */
  showArrow?: boolean
}

/**
 * High-contrast CTA used across the EatinOut landing page.
 * Primary links to the existing /sign-up route (no auth/checkout changed here).
 */
export function PrestonCtaButton({
  href = "/sign-up",
  label = "Start my 30-day free trial",
  className,
  block = false,
  variant = "primary",
  showArrow,
}: PrestonCtaButtonProps) {
  const withArrow = showArrow ?? variant === "primary"

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={cn(block ? "w-full" : "inline-block", className)}
    >
      <Link
        href={href}
        className={cn(
          "group flex min-h-[56px] items-center justify-center gap-2 rounded-full px-8 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4",
          variant === "primary"
            ? "bg-[var(--eo-red)] text-white shadow-lg shadow-[var(--eo-red)]/25 hover:bg-[#b8031f] focus-visible:ring-[var(--eo-red)]/30"
            : "border-2 border-white/70 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 focus-visible:ring-white/40",
          block ? "w-full" : "",
        )}
      >
        {label}
        {withArrow ? (
          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        ) : null}
      </Link>
    </motion.div>
  )
}
