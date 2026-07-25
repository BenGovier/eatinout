"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Reveal } from "./reveal"
import { displayFont } from "@/app/prestonblog/fonts"

const billItems = [
  { item: "Sharing starters", price: "12.00" },
  { item: "Two sirloin steaks", price: "38.00" },
  { item: "Bottle of Malbec", price: "24.00" },
  { item: "Two desserts", price: "12.00" },
]

/**
 * Memorable, visual savings moment: an itemised restaurant bill where the
 * member keeps real money. Copy focuses on money people actually pocket.
 */
export function PrestonSavings() {
  return (
    <section className="relative overflow-hidden bg-[var(--eo-ink)] py-20 sm:py-28">
      {/* Ambient lifestyle image, low opacity for warmth */}
      <Image
        src="/images/prestonblog/lifestyle-friends.png"
        alt=""
        fill
        aria-hidden="true"
        sizes="100vw"
        className="object-cover opacity-15"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--eo-ink)]/80 to-[var(--eo-ink)]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--eo-teal)]">The maths is delicious</p>
          <h2 className={`${displayFont.className} mt-4 text-balance text-4xl font-bold text-white sm:text-5xl`}>
            Same night out. Half the bill.
          </h2>
          <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-white/75">
            A proper dinner for two in Preston — starters, steaks, a good bottle and pudding. Here&apos;s what it looks
            like with EatinOut in your pocket.
          </p>
          <p className="mt-6 text-pretty text-lg font-semibold text-white">
            One meal covers your membership many times over.
          </p>
        </Reveal>

        {/* The bill */}
        <Reveal delay={0.1}>
          <motion.div
            initial={{ rotate: -1.5 }}
            whileHover={{ rotate: 0, y: -4 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="mx-auto w-full max-w-sm rounded-2xl bg-[#fdfcf7] p-7 shadow-2xl shadow-black/40"
          >
            <div className="border-b border-dashed border-black/15 pb-4 text-center">
              <p className={`${displayFont.className} text-xl font-bold text-[var(--eo-ink)]`}>The Winckley Table</p>
              <p className="mt-0.5 text-xs uppercase tracking-widest text-black/40">Preston · Table for two</p>
            </div>

            <ul className="space-y-2.5 py-5 text-sm">
              {billItems.map((line) => (
                <li key={line.item} className="flex items-baseline justify-between text-black/70">
                  <span>{line.item}</span>
                  <span className="tabular-nums">£{line.price}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-2 border-t border-black/10 pt-4">
              <div className="flex items-center justify-between text-black/50">
                <span className="text-sm">Bill total</span>
                <span className="text-lg font-semibold line-through tabular-nums">£86.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--eo-ink)]">You pay as a member</span>
                <span className="text-3xl font-extrabold tabular-nums text-[var(--eo-red)]">£55</span>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-[var(--eo-teal-100)] px-4 py-3 text-center">
              <p className="text-sm font-bold text-[var(--eo-teal)]">You keep £31 in your pocket</p>
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  )
}
