"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Plus, Minus } from "lucide-react"
import { Reveal } from "./reveal"

const faqs = [
  {
    q: "Is it really free for 30 days?",
    a: "Yes. Your first 30 days are completely free and there's no charge today. You only pay if you choose to continue after the trial.",
  },
  {
    q: "How much is it after the trial?",
    a: "Just £4.99 a month after your free 30 days. Most members save that back with a single meal out.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. There's no lock-in — cancel in a couple of taps whenever you like, including during your free trial.",
  },
  {
    q: "How often can I use the offers?",
    a: "As often as you like. EatinOut is a membership, not a one-off voucher — use your offers again and again across Lancashire.",
  },
  {
    q: "Do I need to book through EatinOut?",
    a: "No. Book directly with the restaurant as normal, then show your EatinOut offer at the table to get your discount.",
  },
  {
    q: "How do I redeem an offer?",
    a: "Open the app, pick your offer and show it to your server before you pay. The discount comes straight off your bill.",
  },
  {
    q: "Are there restaurants near me?",
    a: "With 450+ offers across Preston, Blackpool, Blackburn, Burnley, Lytham, Lancaster and beyond, there's plenty to choose from close to home.",
  },
]

/**
 * Objection-handling FAQ. Directly answers the doubts that stop ad traffic
 * from signing up (free trial, price, cancelling, repeat use, redemption).
 */
export function PrestonFaq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5">
        <Reveal className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--eo-red)]">Good to know</p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl md:text-5xl">
            Your questions, answered
          </h2>
        </Reveal>

        <Reveal delay={0.05}>
          <ul className="mt-12 divide-y divide-black/10 border-y border-black/10">
            {faqs.map((faq, i) => {
              const isOpen = open === i
              return (
                <li key={faq.q}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="text-base font-semibold text-[var(--eo-ink)] sm:text-lg">{faq.q}</span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--eo-bg)] text-[var(--eo-red)]">
                      {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="pb-5 pr-11 text-pretty text-base leading-relaxed text-[var(--eo-muted)]">
                          {faq.a}
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </li>
              )
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
