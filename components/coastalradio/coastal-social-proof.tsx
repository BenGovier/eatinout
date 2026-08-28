import { Star } from "lucide-react"
import { Reveal } from "@/components/prestonblog/reveal"

/**
 * PLACEHOLDER reviews — swap for verified reviews before launch.
 * One hero quote + two supporting. No invented Trustpilot scores or counts.
 * Isolated to the /coastalradio campaign.
 */
const HERO_QUOTE = {
  quote: "We used it on our first weekend and saved more than the monthly membership straight away.",
  name: "Local EatinOut member",
}

const SUPPORTING = [
  { quote: "We've already found a couple of new places to try along the coast.", name: "Local member" },
  { quote: "Really simple — show the offer and the saving comes off the bill.", name: "Local member" },
]

export function CoastalSocialProof() {
  return (
    <section className="bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-3xl px-5 sm:px-6">
        {/* PLACEHOLDER review pending verification */}
        <Reveal className="text-center">
          <div className="flex justify-center gap-1 text-[var(--cr-magenta)]" aria-label="5 out of 5 stars">
            {Array.from({ length: 5 }).map((_, s) => (
              <Star key={s} className="h-5 w-5 fill-current" />
            ))}
          </div>
          <blockquote className="mt-5 text-balance text-2xl font-bold leading-snug text-[var(--cr-purple)] sm:text-3xl">
            &ldquo;{HERO_QUOTE.quote}&rdquo;
          </blockquote>
          <figcaption className="mt-4 text-sm font-semibold text-[var(--eo-muted)]">— {HERO_QUOTE.name}</figcaption>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6">
          {SUPPORTING.map((t, i) => (
            <Reveal key={i} delay={0.1 + i * 0.08}>
              {/* PLACEHOLDER review pending verification */}
              <figure className="h-full border-l-2 border-[var(--cr-magenta)] pl-4">
                <blockquote className="text-pretty leading-relaxed text-[var(--eo-ink)]">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-2 text-sm font-semibold text-[var(--eo-muted)]">— {t.name}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
