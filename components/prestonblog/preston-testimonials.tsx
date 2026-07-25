import { Star } from "lucide-react"
import { Reveal } from "./reveal"

const testimonials = [
  { quote: "I've already saved over £140.", author: "Sarah, Preston" },
  { quote: "Paid for itself after one meal.", author: "James, Fulwood" },
  { quote: "So many restaurants I never knew had offers.", author: "Priya, Penwortham" },
]

function Stars() {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
  )
}

export function PrestonTestimonials() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="text-balance text-center text-3xl font-extrabold tracking-tight text-[var(--eo-ink)] sm:text-4xl">
            Loved by Preston diners
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.author} delay={i * 0.1}>
              <figure className="flex h-full flex-col rounded-3xl bg-[var(--eo-bg)] p-7 ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
                <Stars />
                <blockquote className="mt-4 flex-1 text-pretty text-lg font-medium leading-relaxed text-[var(--eo-ink)]">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 text-sm font-semibold text-[var(--eo-muted)]">
                  {t.author}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
