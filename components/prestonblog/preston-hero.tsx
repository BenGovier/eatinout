"use client"

import Image from "next/image"
import { motion, type Variants } from "framer-motion"
import { MapPin, Ban, CalendarCheck } from "lucide-react"
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
    <section className="relative isolate flex min-h-[100svh] items-start overflow-hidden sm:items-center">
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
          Eat out more often.
          <span className="block text-[var(--eo-teal)]">Spend less every time.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-5 max-w-xl text-pretty text-lg font-medium leading-relaxed text-white/90 sm:text-xl"
        >
          Save up to 50% at hundreds of restaurants across Lancashire.
        </motion.p>

        <motion.p variants={item} className="mt-3 max-w-xl text-pretty text-base text-white/75">
          30 days free. Cancel anytime. No charge today.
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

        {/* Bespoke M&S bonus — art-directed into the hero, not a card.
            Oversized reward typography + a floating, glowing gift card that
            bridges the hero into the page below. Scans in under two seconds. */}
        <motion.div variants={item} className="relative mt-12 sm:mt-16">
          <div
            aria-hidden="true"
            className="mb-7 h-px w-full max-w-[16rem] bg-gradient-to-r from-white/30 to-transparent"
          />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            {/* Reward copy — deliberately minimal, huge type */}
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.25em] text-[var(--eo-teal)]">
                <span aria-hidden="true" className="h-px w-8 bg-[var(--eo-teal)]/70" />
                Limited-time bonus
              </span>

              <h2 className="mt-4 flex items-baseline gap-3 leading-[0.85] tracking-tight text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.4)]">
                <span className="text-2xl font-bold text-white/85 sm:text-3xl">FREE</span>
                <span className="text-6xl font-extrabold sm:text-7xl md:text-8xl">£50</span>
              </h2>
              <p className="mt-2 text-2xl font-extrabold uppercase tracking-tight text-white sm:text-3xl">
                M&amp;S Gift Card
              </p>
              <p className="mt-4 text-sm font-medium text-white/70">When you start your FREE 30-day trial.</p>
            </div>

            {/* Floating gift card */}
            <div className="pointer-events-none relative mx-auto sm:mx-0">
              {/* Ambient glow */}
              <motion.div
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--eo-teal)]/25 blur-3xl sm:h-72 sm:w-72"
                animate={{ opacity: [0.35, 0.65, 0.35], scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              />
              <motion.div
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--eo-red)]/20 blur-3xl sm:h-52 sm:w-52"
                animate={{ opacity: [0.5, 0.25, 0.5] }}
                transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              />

              {/* Gentle float */}
              <motion.div
                animate={{ y: [0, -12, 0], rotate: [-1.5, 1.5, -1.5] }}
                transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="relative w-[220px] sm:w-[320px] md:w-[360px]"
              >
                <Image
                  src="/images/prestonblog/ms-giftcard.png"
                  alt="A £50 Marks & Spencer gift card"
                  width={760}
                  height={760}
                  priority
                  className="h-auto w-full [-webkit-mask-image:radial-gradient(ellipse_62%_62%_at_50%_50%,#000_58%,transparent_82%)] [mask-image:radial-gradient(ellipse_62%_62%_at_50%_50%,#000_58%,transparent_82%)]"
                />
                {/* Light shimmer sweep */}
                <div className="absolute inset-0 overflow-hidden [-webkit-mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_55%,transparent_80%)] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_55%,transparent_80%)]">
                  <motion.div
                    className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-[20deg] bg-gradient-to-r from-transparent via-white/45 to-transparent"
                    animate={{ x: ["0%", "460%"] }}
                    transition={{
                      duration: 1.6,
                      repeat: Number.POSITIVE_INFINITY,
                      repeatDelay: 3.5,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
