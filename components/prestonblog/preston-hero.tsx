"use client"

import Image from "next/image"
import { motion, type Variants } from "framer-motion"
import { Ban, CalendarCheck, Gift } from "lucide-react"
import { PrestonCtaButton } from "./preston-cta-button"

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
}

/**
 * Hero for the EatinOut Lancashire ad landing page.
 * Copy mirrors the Facebook ad so clicked-through users feel they're in the
 * right place. Warm dining-out photography, message overlaid.
 */
export function PrestonHero() {
  return (
    <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden sm:items-center">
      <Image
        src="/images/prestonblog/hero-people.png"
        alt="Friends enjoying a meal out together at a local Lancashire restaurant"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Readability overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/65 to-black/45" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-12 pt-24 sm:pb-16 sm:pt-28"
      >
        <motion.h1
          variants={item}
          className="max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-6xl md:text-7xl"
        >
          Eat out more.
          <span className="block text-[var(--eo-teal)]">Spend less every time.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-5 max-w-xl text-pretty text-lg font-medium leading-relaxed text-white/90 sm:text-xl"
        >
          Save up to 50% at 450+ restaurants across Lancashire with a free 30-day trial.
        </motion.p>

        <motion.p
          variants={item}
          className="mt-4 inline-flex max-w-xl items-center gap-2 text-pretty text-sm leading-relaxed text-white/70"
        >
          <Gift className="h-4 w-4 shrink-0 text-[var(--eo-teal)]" />
          Join today and earn a FREE £25 M&amp;S Gift Card after 6 months.
        </motion.p>

        <motion.div variants={item} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <PrestonCtaButton block className="sm:w-auto" />
          <PrestonCtaButton
            variant="secondary"
            href="#how-it-works"
            label="See how it works"
            block
            className="sm:w-auto"
          />
        </motion.div>

        <motion.ul variants={item} className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/80">
          <li className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-[var(--eo-teal)]" /> No charge today
          </li>
          <li className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-[var(--eo-teal)]" /> Cancel anytime
          </li>
        </motion.ul>
      </motion.div>
    </section>
  )
}
