import Image from "next/image"
import { Check } from "lucide-react"
import { PrestonCtaButton } from "@/components/prestonblog/preston-cta-button"

/**
 * Hero for the BlogPreston campaign landing page.
 * One full-bleed lifestyle photograph with a dark gradient over the
 * lower/left for legibility. Single primary CTA to the existing /sign-up flow.
 */
export function CampaignHero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Full-bleed lifestyle photograph */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/prestonblog/campaign/hero-dinner.png"
          alt="Friends laughing together over food and drinks at a lively local restaurant"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Dark gradient — strongest bottom/left for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/10 to-transparent" />
      </div>

      <div className="mx-auto flex min-h-[88svh] max-w-5xl flex-col justify-end px-4 pb-10 pt-24 sm:min-h-[86svh] sm:px-6 sm:pb-16">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85">Local dining, for less</p>

          <h1 className="mt-4 text-balance text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Eat out more.
            <br />
            <span className="text-[var(--eo-teal)]">Spend less every time.</span>
          </h1>

          <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-white/90">
            Save up to 50% at local restaurants across Preston and Lancashire.
          </p>
          <p className="mt-1 text-base font-medium text-white/80">30 days free. Cancel anytime.</p>

          <div className="mt-7">
            <PrestonCtaButton label="Start my 30-day free trial" block className="sm:max-w-sm" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-white/85">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[var(--eo-teal)]" /> No charge today
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[var(--eo-teal)]" /> Cancel anytime
            </span>
          </div>

          <p className="mt-6 text-sm font-semibold text-white/70">450+ restaurant offers across Lancashire</p>
        </div>
      </div>
    </section>
  )
}
