import { Star } from "lucide-react"
import { Reveal } from "./reveal"

const testimonials = [
  {
    quote:
      "We've used it three weekends in a row already. One meal covered months of membership.",
    author: "Hannah",
    area: "Fulwood",
  },
  {
    quote:
      "I honestly wish we'd found EatinOut sooner. We've discovered loads of places we'd never tried.",
    author: "Mark",
    area: "Penwortham",
  },
  {
    quote:
      "We booked somewhere we'd normally avoid because of the price. The saving paid for dessert and drinks.",
    author: "Sophie",
    area: "Preston City Centre",
  },
]

function Stars() {
  return (
    <div className="flex gap-0.5" aria-label="Rated 5 out of 5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
  )
}

/**
 * Believable, local social proof. Real-sounding quotes, first name + area.
 */
export function PrestonTestimonials() {
  return (
    <section className="bg-[var(--eo-bg)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-4xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-5xl">
            Preston&apos;s already tucking in
          </h2>
          <p className="mt-4 text-lg text-[var(--eo-muted)]">Real members, real nights out, real savings.</p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.author} delay={i * 0.1}>
              <figure className="flex h-full flex-col rounded-3xl bg-white p-7 shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10">
                <Stars />
                <blockquote className="mt-4 flex-1 text-pretty text-lg font-medium leading-relaxed text-[var(--eo-ink)]">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-black/5 pt-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--eo-teal-100)] text-sm font-bold text-[var(--eo-teal)]">
                    {t.author.charAt(0)}
                  </span>
                  <span className="text-sm font-semibold text-[var(--eo-ink)]">
                    {t.author}
                    <span className="block font-normal text-[var(--eo-muted)]">{t.area}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
