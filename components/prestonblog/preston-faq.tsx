"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Plus, Minus } from "lucide-react"
import { Reveal } from "./reveal"

const faqs = [
  {
    q: "Is it really free for 30 days?",
    a: "Yes. Your first 30 days are completely free and there's no charge today. You only pay if you choose to continue.",
  },
  {
    q: "How much is it after the trial?",
    a: "Just £4.99 a month. Most members save that back with a single meal out.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. No lock-in — cancel in a couple of taps whenever you like, including during your free trial.",
  },
  {
    q: "How do I use my offers?",
    a: "Book directly with the restaurant as normal, then show your offer in the app at the table. The discount comes straight off your bill — use it as often as you like.",
  },
  {
    q: "Are there restaurants near me?",
    a: "With 450+ offers across Preston, Blackpool, Blackburn, Burnley, Lytham, Lancaster and beyond, there's plenty close to home.",
  },
  {
    q: "When do I receive my £25 M&S Gift Card?",
    a: "Once you've been a member for six continuous months, you'll qualify for your FREE £25 M&S Gift Card.",
    terms: true,
  },
  {
    q: "How do I claim it?",
    a: "It's simple — once you reach six months of membership, just contact us and we'll arrange for your £25 M&S Gift Card to be sent to you.",
    terms: true,
  },
  {
    q: "If I cancel before six months do I still receive it?",
    a: "The gift card is a reward for staying with us for six months, so you'll need to maintain an active membership for the full six months to qualify.",
    terms: true,
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
                          {"terms" in faq && faq.terms ? (
                            <>
                              {" "}
                              <Link
                                href="/mands/terms"
                                className="font-semibold text-[var(--eo-red)] underline underline-offset-2 hover:opacity-80"
                              >
                                See full gift card terms &amp; conditions
                              </Link>
                              .
                            </>
                          ) : null}
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
