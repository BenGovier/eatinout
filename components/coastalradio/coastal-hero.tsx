"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { PrestonCtaButton } from "@/components/prestonblog/preston-cta-button"

/**
 * Immersive co-branded hero. Social dining photo under a Coastal purple/black
 * gradient with a magenta glow. EatinOut red drives the single CTA.
 */
export function CoastalHero() {
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden">
      <Image
        src="/images/coastalradio/hero-social.png"
        alt="Friends enjoying a night out together at a local restaurant"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Coastal purple-black gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--cr-deep)] via-[var(--cr-deep)]/80 to-[var(--cr-deep)]/40" />
      {/* Subtle magenta glow */}
      <div className="pointer-events-none absolute -left-24 bottom-0 h-96 w-96 rounded-full bg-[var(--cr-magenta)]/25 blur-[120px]" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-14 pt-28 sm:px-6 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-xl"
        >
          <span className="inline-flex items-center rounded-full bg-[var(--cr-magenta)] px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-white">
            Exclusive Coastal Radio partner offer
          </span>

          <h1 className="mt-4 text-balance text-[2.6rem] font-extrabold leading-[1.04] tracking-tight text-white sm:text-6xl">
            Eat out more.
            <br />
            <span className="text-[var(--eo-teal)]">Spend less every time.</span>
          </h1>

          <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-white/85">
            Save up to 50% at local restaurants across Blackpool, the Fylde Coast and Lancashire.
          </p>
          <p className="mt-2 text-base font-semibold text-white">30 days free. Cancel anytime.</p>

          <div className="mt-7">
            <PrestonCtaButton label="Start my 30-day free trial" block className="sm:w-auto" />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[var(--eo-teal)]" /> No charge today
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[var(--eo-teal)]" /> Cancel anytime
            </span>
          </div>
          <p className="mt-3 text-sm text-white/70">450+ restaurant offers across Lancashire</p>
        </motion.div>
      </div>
    </section>
  )
}
