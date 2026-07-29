"use client"

import Image from "next/image"
import { motion, type Variants } from "framer-motion"
import { MapPin, Gift, Ban, CalendarCheck } from "lucide-react"
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
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
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
        className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-14 pt-28 sm:pt-32"
      >
        <motion.div
          variants={item}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm"
        >
          <MapPin className="h-4 w-4 text-[var(--eo-teal)]" />
          450+ offers across Lancashire
        </motion.div>

        <motion.h1
          variants={item}
          className="max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-6xl md:text-7xl"
        >
          Save up to 50% at restaurants near you
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-5 max-w-xl text-pretty text-lg font-medium leading-relaxed text-white/90 sm:text-xl"
        >
          450+ offers across Lancashire. Use EatinOut as often as you like.
        </motion.p>

        <motion.p variants={item} className="mt-3 max-w-xl text-pretty text-base text-white/75">
          Try EatinOut free for 30 days — then only £4.99/month. Cancel anytime.
        </motion.p>

        {/* Bonus incentive — clearly secondary to the core offer */}
        <motion.div
          variants={item}
          className="mt-6 inline-flex items-center gap-2.5 rounded-xl border border-[var(--eo-teal)]/40 bg-[var(--eo-teal)]/15 px-4 py-2.5 backdrop-blur-sm"
        >
          <Gift className="h-5 w-5 shrink-0 text-[var(--eo-teal)]" />
          <span className="text-sm font-semibold text-white sm:text-base">
            Sign up today and also get a £50 M&amp;S gift card
          </span>
        </motion.div>

        <motion.div variants={item} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <PrestonCtaButton label="Start Your Free Trial" block className="sm:w-auto" />
          <PrestonCtaButton
            variant="secondary"
            href="#how-it-works"
            label="See How It Works"
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
