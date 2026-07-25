import { Reveal } from "./reveal"
import { displayFont } from "@/app/prestonblog/fonts"

const steps = [
  {
    step: "01",
    title: "Join in under a minute",
    description: "Pop in your details and start your free month. No charge today.",
  },
  {
    step: "02",
    title: "Find your table",
    description: "Browse live offers at independent Preston restaurants, cafés and bars.",
  },
  {
    step: "03",
    title: "Show your membership & save",
    description: "Flash it at the table and the discount comes straight off your bill.",
  },
]

/**
 * Editorial three-step section. Numbers lead; copy is short and human.
 */
export function PrestonHowItWorks() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--eo-red)]">Simple as that</p>
          <h2 className={`${displayFont.className} mt-4 text-balance text-4xl font-bold text-[var(--eo-ink)] sm:text-5xl`}>
            Eating out for less, in three steps
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, i) => (
            <Reveal key={step.step} delay={i * 0.12}>
              <div className="relative">
                <span className={`${displayFont.className} text-6xl font-bold text-[var(--eo-red)]/15`}>
                  {step.step}
                </span>
                <div className="mt-3 h-px w-12 bg-[var(--eo-teal)]" />
                <h3 className="mt-5 text-xl font-bold text-[var(--eo-ink)]">{step.title}</h3>
                <p className="mt-2 text-pretty text-base leading-relaxed text-[var(--eo-muted)]">
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
