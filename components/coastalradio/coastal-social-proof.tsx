"use client"

import { Star } from "lucide-react"
import { Reveal } from "@/components/prestonblog/reveal"

/**
 * PLACEHOLDER testimonials — swap for verified reviews before launch.
 * No invented Trustpilot scores, awards, or customer counts.
 */
const TESTIMONIALS = [
  { quote: "We saved on our first meal out. Really easy to use.", name: "Sarah, Blackpool" },
  { quote: "We've already found a couple of new places to try.", name: "Joanne, Fylde Coast" },
  { quote: "One dinner saved us more than the membership costs.", name: "Mark, Lancashire" },
]

export function CoastalSocialProof() {
  return (
    <section className="bg-[var(--eo-bg)] py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl">
            Loved by local diners
          </h2>
        </Reveal>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1}>
              {/* PLACEHOLDER review pending verification */}
              <figure className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <div className="flex gap-0.5 text-[var(--cr-magenta)]" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-3 flex-1 text-pretty leading-relaxed text-[var(--eo-ink)]">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-sm font-semibold text-[var(--eo-muted)]">— {t.name}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
