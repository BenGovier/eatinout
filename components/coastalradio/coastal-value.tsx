"use client"

import { Reveal } from "@/components/prestonblog/reveal"
import { PrestonCtaButton } from "@/components/prestonblog/preston-cta-button"

/**
 * "Do the maths" value section — the strongest conversion block.
 * A bold receipt example framed by Coastal magenta eyebrow + EatinOut red CTA.
 */
export function CoastalValue() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2 md:gap-14">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--cr-magenta)]">Do the maths</p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl">
            One meal out could pay for months of membership.
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-[var(--eo-muted)]">
            EatinOut is just £4.99/month after your free trial.
          </p>
          <div className="mt-7 hidden md:block">
            <PrestonCtaButton label="Start my free trial" />
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="rounded-2xl border border-black/10 bg-[var(--eo-bg)] p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/40">Dinner for two</p>
            <div className="mt-4 space-y-3 text-[var(--eo-ink)]">
              <div className="flex items-center justify-between text-base">
                <span>Meal</span>
                <span className="tabular-nums">£70.00</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-[var(--eo-red)]">
                <span>Example saving</span>
                <span className="tabular-nums">&minus;£28.00</span>
              </div>
              <div className="flex items-center justify-between border-t border-black/10 pt-3 text-lg font-bold">
                <span>You keep</span>
                <span className="text-2xl font-extrabold tabular-nums text-[var(--cr-purple)]">£28.00</span>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-[var(--cr-purple)] px-4 py-3.5 text-center">
              <p className="text-sm font-bold text-white">That&apos;s more than 5 months of EatinOut.</p>
            </div>
            <p className="mt-3 text-center text-xs text-black/40">Example only. Offers and savings vary.</p>
          </div>
        </Reveal>

        <div className="md:hidden">
          <PrestonCtaButton label="Start my free trial" block />
        </div>
      </div>
    </section>
  )
}
