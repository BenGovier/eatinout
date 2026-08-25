"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Reveal } from "./reveal"
import { PrestonCtaButton } from "./preston-cta-button"
import { EXPERIENCES, EXPERIENCE_FOOTNOTE } from "./offers-data"

/** Decorative food imagery only — the invitation to imagine their own night out. */
const STRIP = EXPERIENCES.map((exp) => exp.image)

/**
 * Invitation section. No cards, no venue names — just appetising food imagery
 * and one call to action, so the reader pictures what THEY want to save on.
 */
export function PrestonOffers() {
  return (
    <section className="overflow-hidden bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl md:text-5xl">
            Where&apos;s your first saving going to be?
          </h2>
          <div className="mt-8 flex justify-center">
            <PrestonCtaButton label="Find offers near me" />
          </div>
        </Reveal>
      </div>

      {/* Continuous, decorative food strip */}
      <div className="relative mt-12 sm:mt-14" aria-hidden="true">
        <motion.div
          className="flex w-max gap-4 sm:gap-5"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 48, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        >
          {[...STRIP, ...STRIP].map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="relative h-40 w-56 shrink-0 overflow-hidden rounded-2xl ring-1 ring-black/5 sm:h-52 sm:w-72"
            >
              <Image src={src || "/placeholder.svg"} alt="" fill sizes="288px" className="object-cover" />
            </div>
          ))}
        </motion.div>

        {/* Soften the edges into the page */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent sm:w-28" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent sm:w-28" />
      </div>

      <p className="mx-auto mt-8 max-w-6xl px-5 text-center text-sm font-medium text-[var(--eo-muted)]">
        {EXPERIENCE_FOOTNOTE}
      </p>
    </section>
  )
}
