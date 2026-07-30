import { Star } from "lucide-react"
import { Reveal } from "./reveal"

const reviews = [
  {
    quote: "We've already used it three weekends in a row. One meal basically paid for months of membership.",
    name: "Hannah M.",
    place: "Preston",
  },
  {
    quote: "We've found loads of places we'd never have tried otherwise. Proper little gems on our doorstep.",
    name: "Dave & Kel",
    place: "Blackburn",
  },
  {
    quote: "Saved enough on our first meal to cover the membership several times over. Bit of a no-brainer really.",
    name: "Priya S.",
    place: "Burnley",
  },
  {
    quote: "Cancelling was easy to find, so I felt fine trying it. Ended up keeping it — we eat out way more now.",
    name: "Tom R.",
    place: "Lancaster",
  },
  {
    quote: "Used it for date night and a family lunch in the same week. Both times the discount just came off the bill.",
    name: "Sophie H.",
    place: "Lytham",
  },
  {
    quote: "Honestly thought there'd be a catch. There wasn't. Show the offer, money off, done.",
    name: "Mark T.",
    place: "Chorley",
  },
]

/**
 * Social proof. Conversational, believable UK reviews (no exaggerated
 * marketing language) that quietly answer doubts — value, variety, cancelling
 * and how easy redemption is.
 */
export function PrestonTestimonials() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className="flex items-center justify-center gap-1" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-[var(--eo-red)] text-[var(--eo-red)]" />
            ))}
          </div>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl md:text-5xl">
            Loved by locals across Lancashire
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, i) => (
            <Reveal key={review.name} delay={(i % 3) * 0.08}>
              <figure className="flex h-full flex-col rounded-3xl bg-[var(--eo-bg)] p-6 ring-1 ring-black/5 sm:p-7">
                <div className="flex gap-0.5" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-[var(--eo-red)] text-[var(--eo-red)]" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-pretty text-base leading-relaxed text-[var(--eo-ink)]">
                  “{review.quote}”
                </blockquote>
                <figcaption className="mt-5 text-sm font-semibold text-[var(--eo-ink)]">
                  {review.name}
                  <span className="font-normal text-[var(--eo-muted)]"> · {review.place}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
