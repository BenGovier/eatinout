import { Reveal } from "@/components/prestonblog/reveal"

const STEPS = [
  { n: "01", title: "Join free", body: "30-day free trial." },
  { n: "02", title: "Pick a place", body: "Browse participating local offers." },
  { n: "03", title: "Go out & save", body: "Use the offer when you visit." },
]

/**
 * Lightweight three-step explainer — type and spacing only.
 * No cards, no icons-in-circles, no SaaS styling.
 * Isolated to the /coastalradio campaign.
 */
export function CoastalHowItWorks() {
  return (
    <section className="bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-4xl px-5 sm:px-6">
        <Reveal>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-[var(--cr-purple)] sm:text-4xl">
            Three steps. That&apos;s it.
          </h2>
        </Reveal>

        <div className="mt-9 grid gap-8 sm:grid-cols-3 sm:gap-10">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.1}>
              <div className="flex items-baseline gap-3 sm:block">
                <span className="text-4xl font-extrabold tabular-nums text-[var(--cr-magenta)]">{step.n}</span>
                <div className="sm:mt-3">
                  <h3 className="text-lg font-extrabold uppercase tracking-tight text-[var(--eo-ink)]">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-pretty leading-relaxed text-[var(--eo-muted)]">{step.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
