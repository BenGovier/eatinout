"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Reveal } from "./reveal"
import { EXPERIENCES, EXPERIENCE_SAVING, EXPERIENCE_FOOTNOTE, type Experience } from "./offers-data"

/**
 * Experiences section. Sells the OCCASION, not the venue — so ad traffic from
 * anywhere in Lancashire pictures their own next night out. Horizontal
 * snap-carousel on mobile (thumb-friendly), grid on larger screens.
 */
export function PrestonOffers({ experiences = EXPERIENCES }: { experiences?: Experience[] }) {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--eo-red)]">Your next night out</p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl md:text-5xl">
            Where&apos;s your first saving going to be?
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-[var(--eo-muted)]">
            Whatever you fancy, there&apos;s an offer for it — and you&apos;ll pay a lot less than full price.
          </p>
        </Reveal>
      </div>

      {/* Mobile: horizontal snap carousel. md+: centered grid. */}
      <div className="mt-12 sm:mt-14">
        <div
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-pl-5 px-5 pb-4 scrollbar-hide sm:gap-6 md:mx-auto md:max-w-6xl md:grid md:grid-cols-3 md:overflow-visible md:px-5 md:pb-0"
        >
          {experiences.map((exp, i) => (
            <ExperienceCard key={exp.id} experience={exp} index={i} />
          ))}
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-6xl px-5 text-center text-sm font-medium text-[var(--eo-muted)]">
        {EXPERIENCE_FOOTNOTE}
      </p>
    </section>
  )
}

function ExperienceCard({ experience, index }: { experience: Experience; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
      whileHover={{ y: -6 }}
      className="group relative aspect-[3/4] w-[78%] shrink-0 snap-start overflow-hidden rounded-3xl shadow-lg shadow-black/10 ring-1 ring-black/5 sm:w-[46%] md:aspect-[4/5] md:w-auto"
    >
      <Image
        src={experience.image || "/placeholder.svg"}
        alt={`${experience.title} — ${EXPERIENCE_SAVING.toLowerCase()} with EatinOut`}
        fill
        sizes="(max-width: 640px) 78vw, (max-width: 768px) 46vw, 33vw"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

      {/* Dominant saving badge */}
      <div className="absolute left-4 top-4 rounded-full bg-[var(--eo-red)] px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-white shadow-lg">
        {EXPERIENCE_SAVING}
      </div>
      {experience.tag ? (
        <div className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[var(--eo-ink)] shadow-sm backdrop-blur-sm">
          {experience.tag}
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="text-2xl font-bold tracking-tight text-white">{experience.title}</h3>
        <p className="mt-1.5 text-pretty text-sm leading-snug text-white/85">{experience.blurb}</p>
      </div>
    </motion.article>
  )
}
