"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PrestonCtaButtonProps {
  /** Where the trial CTA points. Matches the existing marketing flow. */
  href?: string
  label?: string
  className?: string
  /** Full-width on mobile */
  block?: boolean
}

/**
 * Premium, high-contrast trial CTA used across the /prestonblog page.
 * Links to the existing /sign-up route (no auth/checkout logic changed here).
 */
export function PrestonCtaButton({
  href = "/sign-up",
  label = "Start My FREE Trial",
  className,
  block = false,
}: PrestonCtaButtonProps) {
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
          "group flex min-h-[56px] items-center justify-center gap-2 rounded-full bg-red-600 px-8 text-base font-semibold text-white shadow-lg shadow-red-600/25 transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-600/30",
          block ? "w-full" : "",
        )}
      >
        {label}
        <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
      </Link>
    </motion.div>
  )
}
