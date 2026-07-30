"use client"

import Link from "next/link"
import { motion } from "framer-motion"

/**
 * PrestonBonusBand
 * A full-width, art-directed advertising band — not a UI card.
 * Pure EatinOut red field, oversized reward typography, and a premium
 * M&S gift card rendered in crisp CSS (authentic yellow/black branding)
 * that floats bottom-right, rotated and overlapping the £50 for depth.
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
        <span className="font-bold leading-none text-black [font-size:13cqw]">£50</span>
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
      aria-label="Start your free trial and get a free £50 M&S gift card"
      className="group relative flex min-h-[280px] w-full items-center overflow-hidden bg-[var(--eo-red)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white/50"
    >
      {/* Reward typography — reads FREE → £50 → M&S GIFT CARD → supporting line */}
      <div className="relative z-10 max-w-[58%] px-6 py-8 sm:mx-auto sm:w-full sm:max-w-6xl sm:px-10">
        <p className="text-[32px] font-bold leading-none text-white">FREE</p>
        <p className="mt-1 text-[88px] font-extrabold leading-[0.82] tracking-tight text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.25)]">
          £50
        </p>
        <p className="mt-2 whitespace-nowrap text-[26px] font-bold uppercase leading-none tracking-tight text-white sm:text-[34px]">
          M&amp;S Gift Card
        </p>
        <p className="mt-3 text-[15px] font-medium leading-snug text-white/80 sm:text-[18px]">
          When you start your free trial
        </p>
      </div>

      {/* Premium floating gift card — bottom right, rotated, overlapping the £50.
          Rotation lives on this static wrapper so the motion float below can't override it. */}
      <div
        className="pointer-events-none absolute -bottom-[7%] -right-[8%] z-20 w-[54%] max-w-[300px] -rotate-12 sm:right-[7%] sm:w-[32%]"
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

          {/* Subtle reflection underneath */}
          <div
            aria-hidden="true"
            className="absolute left-0 top-full mt-[2%] w-full scale-y-[-1] opacity-20 [mask-image:linear-gradient(to_bottom,#000,transparent_55%)]"
            style={{ containerType: "inline-size" }}
          >
            <GiftCardFace reflection />
          </div>
        </motion.div>
      </div>
    </Link>
  )
}
