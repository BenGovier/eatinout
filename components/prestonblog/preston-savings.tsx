"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { Reveal } from "./reveal"

const billItems = [
  { item: "Sharing starters", price: "12.00" },
  { item: "Two mains", price: "38.00" },
  { item: "Bottle of wine", price: "24.00" },
  { item: "Two desserts", price: "12.00" },
]

const benefits = ["Save up to 50%", "Hundreds of restaurants", "Use whenever you like"]

/**
 * "Do the maths" value comparison. Anchors the £4.99/month price against the
 * saving from a single meal so the membership is easy to justify.
 */
export function PrestonSavings() {
  return (
    <section className="relative overflow-hidden bg-[var(--eo-ink)] py-20 sm:py-28">
      <Image
        src="/images/prestonblog/moment-pizza.png"
        alt=""
        fill
        aria-hidden="true"
        sizes="100vw"
        className="object-cover opacity-15"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--eo-ink)]/80 to-[var(--eo-ink)]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--eo-gold-light)]">Do the maths</p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            One meal can pay for months of membership.
          </h2>
          <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-white/75">
            Here&apos;s what a typical dinner for two can look like.
          </p>

          <ul className="mt-8 space-y-3">
            {benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-center gap-4 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--eo-gold)]/20 text-[var(--eo-gold-light)]">
                  <Check className="h-4 w-4" />
                </span>
                <span className="text-pretty text-base font-medium text-white/85">{benefit}</span>
              </li>
            ))}
          </ul>
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
              <p className="text-xl font-bold tracking-tight text-[var(--eo-ink)]">Dinner for two</p>
            </div>

            <ul className="space-y-2.5 py-5 text-sm">
              {billItems.map((line) => (
                <li key={line.item} className="flex items-baseline justify-between text-black/70">
                  <span>{line.item}</span>
                  <span className="tabular-nums">£{line.price}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-2.5 border-t border-black/10 pt-4 text-sm">
              <div className="flex items-center justify-between text-black/55">
                <span>Original bill</span>
                <span className="font-semibold line-through tabular-nums">£86.00</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-[var(--eo-red)]">
                <span className="flex items-center gap-2">
                  Saving
                  <span className="rounded-full bg-[var(--eo-red)] px-2 py-0.5 text-xs font-bold text-white">50%</span>
                </span>
                <span className="tabular-nums">&minus;£43.00</span>
              </div>
              <div className="flex items-center justify-between border-t border-black/10 pt-2.5 font-bold text-[var(--eo-ink)]">
                <span>New total</span>
                <span className="text-2xl font-extrabold tabular-nums">£43.00</span>
              </div>
            </div>

            <div
              className="mt-5 overflow-hidden rounded-xl px-4 py-4 text-center ring-1 ring-[var(--eo-gold-dark)]/40"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, var(--eo-gold-dark) 0%, var(--eo-gold-light) 38%, #fff6d8 50%, var(--eo-gold-light) 62%, var(--eo-gold-dark) 100%)",
              }}
            >
              <p className="text-2xl font-extrabold uppercase tracking-tight text-[var(--eo-ink)] drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]">
                You saved £43
              </p>
              <p className="mt-1 text-xs font-semibold text-[var(--eo-ink)]/80">
                That&apos;s over 8 months of membership from one meal.
              </p>
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  )
}
