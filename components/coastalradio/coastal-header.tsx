import Link from "next/link"
import { CoBrandLockup } from "./coastal-lockup"

/**
 * Compact co-branded header: Coastal Radio × EatinOut lockup on the left,
 * a single trial CTA on the right. No nav, menu, login, or pricing.
 * Sits directly over the top of the immersive hero.
 */
export function CoastalHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-4 sm:px-6">
        <CoBrandLockup tone="light" />
        <Link
          href="/sign-up"
          className="inline-flex min-h-[40px] items-center rounded-full bg-[var(--eo-red)] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#b8031f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--eo-red)]/30"
        >
          Start free trial
        </Link>
      </div>
    </header>
  )
}
