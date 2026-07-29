"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Reveal } from "./reveal"

const billItems = [
  { item: "Sharing starters", price: "12.00" },
  { item: "Two mains", price: "38.00" },
  { item: "Bottle of wine", price: "24.00" },
  { item: "Two desserts", price: "12.00" },
]

const examples = [
  { save: "£10+", label: "saved on one meal for two" },
  { save: "£20+", label: "saved on a family meal out" },
  { save: "£4.99", label: "your whole monthly membership" },
]

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
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--eo-teal)]">Do the maths</p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            One meal out could save more than a whole month&apos;s membership
          </h2>
          <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-white/75">
            EatinOut is just £4.99/month after your free trial. Save that back — and more — the very first time you eat
            out.
          </p>

          <ul className="mt-8 space-y-3">
            {examples.map((ex) => (
              <li
                key={ex.label}
                className="flex items-center gap-4 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
              >
                <span className="w-16 shrink-0 text-2xl font-extrabold tabular-nums text-[var(--eo-teal)]">
                  {ex.save}
                </span>
                <span className="text-pretty text-sm font-medium text-white/85">{ex.label}</span>
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
              <p className="mt-0.5 text-xs uppercase tracking-widest text-black/40">A local Lancashire restaurant</p>
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
                <span className="text-sm font-semibold text-[var(--eo-ink)]">You pay with EatinOut</span>
                <span className="text-3xl font-extrabold tabular-nums text-[var(--eo-red)]">£55</span>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-[var(--eo-teal-100)] px-4 py-3 text-center">
              <p className="text-sm font-bold text-[var(--eo-teal)]">You keep £31 — that&apos;s 6 months of membership</p>
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  )
}
