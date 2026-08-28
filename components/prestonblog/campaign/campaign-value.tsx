import { PrestonCtaButton } from "@/components/prestonblog/preston-cta-button"
import { Reveal } from "@/components/prestonblog/reveal"

/**
 * "Do the maths" value-proof section for the BlogPreston campaign.
 * One strong illustrative receipt showing how a single meal can cover
 * months of membership. Figures are illustrative only.
 */
export function CampaignValue() {
  return (
    <section className="bg-[var(--eo-ink)] py-16 sm:py-24">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2 md:gap-14">
        <Reveal>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--eo-teal)]">Do the maths</p>
            <h2 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              One meal out could pay for months of membership.
            </h2>
            <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-white/70">
              EatinOut is just £4.99/month after your free trial.
            </p>

            <div className="mt-8 hidden md:block">
              <PrestonCtaButton label="Start my free trial" />
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          {/* Illustrative receipt */}
          <div className="mx-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl shadow-black/40 sm:p-7">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
              Dinner for two
            </p>

            <dl className="mt-6 space-y-3 text-[var(--eo-ink)]">
              <div className="flex items-center justify-between text-base">
                <dt className="text-black/70">Meal</dt>
                <dd className="font-semibold tabular-nums">£70.00</dd>
              </div>
              <div className="flex items-center justify-between text-base text-[var(--eo-red)]">
                <dt className="font-medium">Example saving</dt>
                <dd className="font-semibold tabular-nums">&minus;£28.00</dd>
              </div>
              <div className="mt-2 flex items-center justify-between border-t-2 border-dashed border-black/10 pt-4">
                <dt className="text-sm font-bold uppercase tracking-wide text-black/60">You keep</dt>
                <dd className="text-3xl font-extrabold tabular-nums text-[var(--eo-ink)]">£28</dd>
              </div>
            </dl>

            <div className="mt-6 rounded-xl bg-[var(--eo-teal)] px-4 py-3.5 text-center">
              <p className="text-sm font-bold text-white">That&apos;s more than 5 months of EatinOut.</p>
            </div>

            <p className="mt-4 text-center text-xs text-black/40">Example only. Offers and savings vary.</p>
          </div>
        </Reveal>

        <div className="md:hidden">
          <PrestonCtaButton label="Start my free trial" block />
        </div>
      </div>
    </section>
  )
}
