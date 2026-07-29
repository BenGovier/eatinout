import { Gift } from "lucide-react"
import { PrestonCtaButton } from "./preston-cta-button"
import { Reveal } from "./reveal"

/**
 * M&S gift-card bonus. Framed as an extra reward for starting the trial —
 * EatinOut stays the main product. Uses a tasteful styled gift-card element
 * rather than recreating M&S brand artwork.
 */
export function PrestonMsBonus() {
  return (
    <section className="bg-[var(--eo-bg)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="grid items-center gap-10 rounded-3xl bg-white p-7 shadow-sm ring-1 ring-black/5 sm:p-10 lg:grid-cols-2 lg:gap-14 lg:p-14">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--eo-teal)]/15 px-3.5 py-1.5 text-sm font-semibold text-[var(--eo-teal)]">
                <Gift className="h-4 w-4" />
                Bonus for signing up today
              </span>
              <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl">
                Start your free trial today and also get a £50 M&amp;S gift card
              </h2>
              <p className="mt-4 text-pretty text-lg leading-relaxed text-[var(--eo-muted)]">
                Enjoy 30 days free, start saving at local restaurants, and receive a £50 M&amp;S gift card when you sign
                up today.
              </p>

              <div className="mt-8">
                <PrestonCtaButton label="Claim Your Free Trial" />
              </div>
              <p className="mt-4 text-xs text-[var(--eo-muted)]">Gift card terms apply.</p>
            </div>

            {/* Styled gift-card visual */}
            <div className="flex justify-center">
              <div className="relative w-full max-w-sm">
                <div className="relative aspect-[1.6/1] overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--eo-ink)] to-[#1f2937] p-6 text-white shadow-2xl shadow-black/25">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase tracking-widest text-white/70">Gift Card</span>
                    <Gift className="h-6 w-6 text-[var(--eo-teal)]" />
                  </div>
                  <div className="mt-8">
                    <p className="text-5xl font-extrabold tracking-tight">£50</p>
                    <p className="mt-1 text-sm font-medium text-white/70">Marks &amp; Spencer</p>
                  </div>
                  <div className="mt-6 h-8 w-14 rounded-md bg-gradient-to-br from-amber-300 to-amber-500" aria-hidden />
                </div>
                {/* Ribbon accent */}
                <div className="absolute -right-3 -top-3 rotate-6 rounded-lg bg-[var(--eo-red)] px-3 py-1.5 text-sm font-bold text-white shadow-lg">
                  Free bonus
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
