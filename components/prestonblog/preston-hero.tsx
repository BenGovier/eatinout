"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { PrestonCtaButton } from "./preston-cta-button"

const trustPoints = ["No charge today", "Cancel anytime", "Takes less than 60 seconds"]

export function PrestonHero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-10 sm:pt-14 lg:grid-cols-2 lg:gap-12 lg:pb-24 lg:pt-20">
        {/* Copy */}
        <div className="flex flex-col items-start">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--eo-teal-100)] px-4 py-1.5 text-sm font-semibold text-[var(--eo-teal)]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--eo-teal)]" />
            Exclusive for BlogPreston readers
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-[var(--eo-ink)] sm:text-5xl lg:text-6xl"
          >
            Save up to <span className="text-[var(--eo-red)]">50%</span> at Preston restaurants
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-[var(--eo-muted)]"
          >
            Discover exclusive dining offers at local restaurants, cafés and bars. Start your FREE
            30-day trial today. No charge today. Cancel anytime.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 w-full sm:w-auto"
          >
            <PrestonCtaButton block className="sm:inline-block sm:w-auto" />
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-6"
          >
            {trustPoints.map((point) => (
              <li key={point} className="flex items-center gap-2 text-sm font-medium text-[var(--eo-ink)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--eo-teal-100)]">
                  <Check className="h-3 w-3 text-[var(--eo-teal)]" />
                </span>
                {point}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-2xl shadow-black/10 sm:aspect-[5/4] lg:aspect-[4/5]">
            <Image
              src="/images/prestonblog/hero-dining.png"
              alt="Friends enjoying dinner and wine together at an elegant Preston restaurant"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          {/* Floating savings chip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="absolute -bottom-4 left-4 rounded-2xl bg-white p-4 shadow-xl shadow-black/10 sm:left-6"
          >
            <p className="text-xs font-medium text-[var(--eo-muted)]">Members save on average</p>
            <p className="text-2xl font-extrabold text-[var(--eo-red)]">£312 / year</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
