import { Star } from "lucide-react"
import { Reveal } from "@/components/prestonblog/reveal"

/**
 * Compact trust section — exactly three testimonials.
 *
 * PLACEHOLDER CONTENT — these testimonials are illustrative and MUST be
 * replaced with verified customer reviews before this campaign goes live.
 * No Trustpilot ratings, awards, customer counts or press claims are made.
 */
const TESTIMONIALS = [
  { quote: "We saved on our first meal out. Really easy to use.", name: "Sarah, Preston" },
  { quote: "Used it for a family dinner and it more than paid for itself.", name: "James, Fulwood" },
  { quote: "Handy for date night — we eat out more now without overspending.", name: "Emma, Leyland" },
]

export function CampaignTrust() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal>
          <h2 className="text-balance text-center text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl">
            Loved by local diners
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1}>
              {/* PLACEHOLDER testimonial — replace with a verified review */}
              <figure className="flex h-full flex-col rounded-2xl bg-[var(--eo-bg)] p-6">
                <div className="flex gap-0.5 text-[var(--eo-red)]" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-pretty text-base leading-relaxed text-[var(--eo-ink)]">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-sm font-semibold text-[var(--eo-muted)]">{t.name}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
