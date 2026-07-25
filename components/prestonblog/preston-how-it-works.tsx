import { UserPlus, Tag, UtensilsCrossed } from "lucide-react"
import { Reveal } from "./reveal"

const steps = [
  {
    icon: UserPlus,
    step: "1",
    title: "Join Free",
    description: "Start your FREE 30-day trial.",
  },
  {
    icon: Tag,
    step: "2",
    title: "Choose an Offer",
    description: "Browse local restaurant discounts.",
  },
  {
    icon: UtensilsCrossed,
    step: "3",
    title: "Enjoy Your Meal",
    description: "Show your membership and save.",
  },
]

export function PrestonHowItWorks() {
  return (
    <section className="bg-[var(--eo-bg)] py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="text-balance text-center text-3xl font-extrabold tracking-tight text-[var(--eo-ink)] sm:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-pretty text-center text-base text-[var(--eo-muted)]">
            Three simple steps to start saving on the meals you already love.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.step} delay={i * 0.12}>
              <div className="group relative h-full rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/10">
                <span className="absolute right-6 top-6 text-5xl font-extrabold text-black/5">
                  {step.step}
                </span>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--eo-teal-100)] text-[var(--eo-teal)] transition-transform duration-300 group-hover:scale-110">
                  <step.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-[var(--eo-ink)]">{step.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-[var(--eo-muted)]">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
