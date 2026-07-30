import { UtensilsCrossed, PiggyBank, Compass, Heart } from "lucide-react"
import { Reveal } from "./reveal"

const reasons = [
  {
    icon: UtensilsCrossed,
    title: "Eat out more often",
    blurb: "Say yes to more dinners, brunches and spontaneous catch-ups — guilt-free.",
  },
  {
    icon: PiggyBank,
    title: "Save up to 50%",
    blurb: "Real money off your bill, every single time you dine with an offer.",
  },
  {
    icon: Compass,
    title: "Discover local gems",
    blurb: "Find brilliant restaurants near you that you'd never have tried otherwise.",
  },
  {
    icon: Heart,
    title: "Support local businesses",
    blurb: "Every meal helps independent Lancashire restaurants thrive.",
  },
]

/**
 * "Why people join" — emotion-first reasons that come before the practical
 * how/price detail. Warm, scannable, four premium cards.
 */
export function PrestonWhyJoin() {
  return (
    <section className="bg-[var(--eo-bg)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--eo-red)]">Why people join</p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl md:text-5xl">
            More meals out. More memories. Less spent.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason, i) => (
            <Reveal key={reason.title} delay={(i % 4) * 0.08}>
              <div className="group h-full rounded-3xl bg-white p-7 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-lg">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--eo-red)]/10 text-[var(--eo-red)] transition-colors group-hover:bg-[var(--eo-red)] group-hover:text-white">
                  <reason.icon className="h-7 w-7" />
                </span>
                <h3 className="mt-5 text-xl font-bold tracking-tight text-[var(--eo-ink)]">{reason.title}</h3>
                <p className="mt-2 text-pretty text-base leading-relaxed text-[var(--eo-muted)]">{reason.blurb}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
