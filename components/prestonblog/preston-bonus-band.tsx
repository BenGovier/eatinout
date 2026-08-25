"use client"

import Link from "next/link"
import { motion } from "framer-motion"

/**
 * PrestonBonusBand
 * Full-width advertising band on the EatinOut red field — not a UI card.
 * Two clear columns: uncramped reward copy on the left, a premium M&S gift
 * card rendered in crisp CSS on the right. The card is fully inside the frame
 * at every breakpoint (it used to bleed off screen on mobile).
 * The entire band is the call to action.
 */

/** The M&S gift card face, drawn in CSS so it stays razor-sharp at any scale. */
function GiftCardFace({ reflection = false }: { reflection?: boolean }) {
  return (
    <div
      aria-hidden={reflection || undefined}
      className="relative flex aspect-[1.585/1] w-full flex-col justify-between rounded-[7%] bg-[#FFDB00] p-[7%] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.55)] ring-1 ring-black/5"
    >
      {/* Top row: denomination */}
      <div className="flex justify-end">
        <span className="font-bold leading-none text-black [font-size:13cqw]">£25</span>
      </div>

      {/* Hero wordmark */}
      <div className="flex flex-1 items-center">
        <span className="font-sans font-bold leading-none tracking-[-0.04em] text-black [font-size:34cqw]">
          M&amp;S
        </span>
      </div>

      {/* Footer label */}
      <div>
        <span className="font-semibold uppercase tracking-[0.18em] text-black/90 [font-size:8.5cqw]">Gift Card</span>
      </div>
    </div>
  )
}

export function PrestonBonusBand() {
  return (
    <Link
      href="/sign-up"
      aria-label="Your loyalty deserves rewarding. Stay subscribed for 6 months and qualify for a free £25 M&S gift card"
      className="group block w-full overflow-hidden bg-[var(--eo-red)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white/50"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-6 py-14 text-center sm:px-10 sm:py-16 lg:flex-row lg:justify-between lg:gap-16 lg:text-left">
        {/* Reward copy — generous line length, room to breathe */}
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Members&apos; reward</p>
          <h2 className="mt-4 text-balance text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-4xl md:text-5xl">
            Your loyalty deserves rewarding.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-pretty text-lg font-medium leading-relaxed text-white/90 sm:text-xl lg:mx-0">
            Stay subscribed for 6 months and you&apos;ll qualify for a FREE £25 M&amp;S Gift Card.
          </p>
        </div>

        {/* Premium gift card — always fully in frame, gently tilted */}
        <div
          className="w-full max-w-[300px] shrink-0 -rotate-6 lg:w-[34%] lg:max-w-[360px]"
          style={{ containerType: "inline-size" }}
        >
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          >
            {/* Card + light sweep */}
            <div className="relative overflow-hidden rounded-[7%]">
              <GiftCardFace />
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[7%]">
                <motion.div
                  className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-[20deg] bg-gradient-to-r from-transparent via-white/45 to-transparent"
                  animate={{ x: ["0%", "520%"] }}
                  transition={{
                    duration: 1.4,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatDelay: 8,
                    ease: "easeInOut",
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Link>
  )
}
