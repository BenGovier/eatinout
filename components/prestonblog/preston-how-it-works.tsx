import { Reveal } from "./reveal"

const steps = [
  {
    step: "1",
    title: "Join EatinOut free for 30 days",
    description: "Sign up in under a minute. No charge today — your first month is completely free.",
  },
  {
    step: "2",
    title: "Choose local restaurant offers",
    description: "See discounts at restaurants, cafés and bars across Lancashire.",
  },
  {
    step: "3",
    title: "Show your voucher and save",
    description: "Show it at the table and the staff will sort the rest.",
  },
]

/**
 * Three-step explainer. The closing callout removes the biggest ad-traffic
 * doubt: that this is a one-off voucher rather than a repeat-use membership.
 */
export function PrestonHowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-[var(--eo-bg)] py-14 sm:py-16">
      <div className="mx-auto max-w-5xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--eo-red)]">How it works</p>
          <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-3xl">
            Saving at local restaurants is easy
          </h2>
        </Reveal>

        <div className="mt-9 grid gap-7 md:grid-cols-3 md:gap-8">
          {steps.map((step, i) => (
            <Reveal key={step.step} delay={i * 0.12}>
              <div className="flex gap-4 md:block">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--eo-red)] text-sm font-bold text-white">
                  {step.step}
                </span>
                <div className="md:mt-4">
                  <h3 className="text-base font-bold text-[var(--eo-ink)] sm:text-lg">{step.title}</h3>
                  <p className="mt-1.5 text-pretty text-sm leading-relaxed text-[var(--eo-muted)]">
                    {step.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
