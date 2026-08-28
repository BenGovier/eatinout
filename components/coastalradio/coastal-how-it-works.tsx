"use client"

import { Reveal } from "@/components/prestonblog/reveal"

const STEPS = [
  { n: "01", title: "Join free", body: "Start your 30-day free trial." },
  { n: "02", title: "Find somewhere you fancy", body: "Browse current offers at participating restaurants." },
  { n: "03", title: "Eat out & save", body: "Follow the offer instructions when you visit." },
]

/**
 * Three-step explainer built with type and spacing — no heavy cards.
 */
export function CoastalHowItWorks() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl">
            Saving locally is easy.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-10">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.1}>
              <div className="border-t-2 border-[var(--cr-magenta)] pt-4">
                <span className="text-3xl font-extrabold tabular-nums text-[var(--cr-purple)]">{step.n}</span>
                <h3 className="mt-2 text-lg font-bold text-[var(--eo-ink)]">{step.title}</h3>
                <p className="mt-1.5 text-pretty leading-relaxed text-[var(--eo-muted)]">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
