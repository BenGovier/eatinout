import { RefreshCw } from "lucide-react"
import { Reveal } from "./reveal"

const steps = [
  {
    step: "01",
    title: "Join EatinOut free for 30 days",
    description: "Sign up in under a minute. No charge today — your first month is completely free.",
  },
  {
    step: "02",
    title: "Choose local restaurant offers",
    description: "See live discounts at restaurants, cafés and bars right across Lancashire.",
  },
  {
    step: "03",
    title: "Show your voucher in venue and save",
    description: "Flash your offer at the table and the discount comes straight off your bill.",
  },
]

/**
 * Three-step explainer. The closing callout removes the biggest ad-traffic
 * doubt: that this is a one-off voucher rather than a repeat-use membership.
 */
export function PrestonHowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-[var(--eo-bg)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--eo-red)]">How it works</p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl md:text-5xl">
            Saving at local restaurants is easy
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, i) => (
            <Reveal key={step.step} delay={i * 0.12}>
              <div className="relative">
                <span className="text-6xl font-extrabold tracking-tight text-[var(--eo-red)]/15">{step.step}</span>
                <div className="mt-3 h-px w-12 bg-[var(--eo-teal)]" />
                <h3 className="mt-5 text-xl font-bold text-[var(--eo-ink)]">{step.title}</h3>
                <p className="mt-2 text-pretty text-base leading-relaxed text-[var(--eo-muted)]">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mx-auto mt-14 flex max-w-2xl items-center gap-3 rounded-2xl bg-white px-5 py-4 text-center shadow-sm ring-1 ring-black/5 sm:justify-center">
            <RefreshCw className="h-5 w-5 shrink-0 text-[var(--eo-teal)]" />
            <p className="text-pretty text-sm font-semibold text-[var(--eo-ink)] sm:text-base">
              Not a one-off voucher — use your offers again and again, as often as you like.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
