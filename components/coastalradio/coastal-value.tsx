import { Reveal } from "@/components/prestonblog/reveal"

/**
 * Bold saving comparison — an advertising graphic, NOT a receipt.
 * Deep Coastal-purple background, oversized typography, three big figures.
 * Isolated to the /coastalradio campaign.
 */
export function CoastalValue() {
  return (
    <section className="bg-[var(--cr-deep)] py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-5 sm:px-6">
        <Reveal className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          <div className="text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/55">Your meal</p>
            <p className="mt-2 text-5xl font-extrabold tabular-nums text-white sm:text-6xl">£60</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--cr-pink)]">Potential 40% saving</p>
            <p className="mt-2 text-5xl font-extrabold tabular-nums text-[var(--cr-magenta)] sm:text-6xl">
              &minus;£24
            </p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/55">You keep</p>
            <p className="mt-2 text-5xl font-extrabold tabular-nums text-[var(--eo-teal)] sm:text-6xl">£24</p>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="mt-10 border-t border-white/15 pt-8">
            <p className="text-balance text-2xl font-bold leading-snug text-white sm:text-3xl">
              EatinOut is £4.99/month after your free trial.
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--cr-pink)]">
              £24 = almost 5 months of membership.
            </p>
            <p className="mt-4 text-xs text-white/45">Example only. Participating offers and savings vary.</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
