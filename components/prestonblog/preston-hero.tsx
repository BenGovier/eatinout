"use client"

import Image from "next/image"
import { motion, type Variants } from "framer-motion"
import { Star, ShieldCheck, CalendarCheck, Ban } from "lucide-react"
import { PrestonCtaButton } from "./preston-cta-button"

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

/**
 * Immersive, full-bleed hero for the /prestonblog landing page.
 * The restaurant photograph does the emotional work; messaging is overlaid.
 */
export function PrestonHero() {
  return (
    <section className="relative isolate flex min-h-[92vh] items-center overflow-hidden">
      <Image
        src="/images/prestonblog/hero-people.png"
        alt="Friends laughing and toasting drinks together at a Preston restaurant"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Readability overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-28"
      >
        <motion.div
          variants={item}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--eo-teal)]" />
          Exclusive for BlogPreston readers
        </motion.div>

        <motion.h1
          variants={item}
          className="max-w-3xl text-balance text-5xl font-extrabold leading-[1.02] tracking-tight text-white drop-shadow-sm sm:text-6xl md:text-7xl"
        >
          Save up to 50%
          <span className="mt-3 block text-2xl font-medium text-white/85 sm:text-3xl md:text-4xl">
            at Preston&apos;s best restaurants
          </span>
        </motion.h1>

        <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="rounded-lg bg-[var(--eo-red)] px-3 py-1.5 text-lg font-bold text-white shadow-lg">
            30 days free
          </span>
          <span className="flex items-center gap-1.5 text-white/90">
            <span className="flex" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </span>
            <span className="text-sm font-medium">Loved by local diners</span>
          </span>
        </motion.div>

        <motion.p variants={item} className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-white/85">
          One membership. Real discounts at independent Preston restaurants, cafés and bars. Your first month is on us.
        </motion.p>

        <motion.div variants={item} className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <PrestonCtaButton label="Start my free month" />
          <span className="text-sm font-medium text-white/70">No charge today · Cancel anytime</span>
        </motion.div>

        <motion.ul variants={item} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/80">
          <li className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-[var(--eo-teal)]" /> No charge today
          </li>
          <li className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-[var(--eo-teal)]" /> Cancel anytime
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--eo-teal)]" /> Secure checkout
          </li>
        </motion.ul>
      </motion.div>
    </section>
  )
}
