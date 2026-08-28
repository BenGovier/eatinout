import Image from "next/image"
import { Reveal } from "@/components/prestonblog/reveal"
import { PrestonCtaButton } from "@/components/prestonblog/preston-cta-button"

/**
 * Coastal Radio sign-off — a solid Coastal-purple panel (NOT a big photo)
 * with a subtle Blackpool skyline silhouette along the bottom edge.
 * Isolated to the /coastalradio campaign.
 */
export function CoastalFinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-[var(--cr-purple)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-[var(--cr-magenta)] opacity-25 blur-[120px]"
      />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 pb-36 pt-16 text-center sm:px-6 sm:pb-44 sm:pt-20">
        <Reveal className="flex flex-col items-center">
          <span className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--cr-pink)]">
            Coastal Radio &times; EatinOut
          </span>
          <h2 className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Your next meal out could cost a lot less.
          </h2>
          <p className="mt-4 max-w-xl text-pretty text-lg leading-relaxed text-white/85">
            Start your 30-day free trial and discover local offers across Blackpool, the Fylde Coast and Lancashire.
          </p>
          <div className="mt-8 w-full sm:w-auto">
            <PrestonCtaButton label="Start my free trial" block className="sm:w-auto" />
          </div>
          <p className="mt-5 text-sm text-white/70">No charge today &bull; Cancel anytime &bull; Then £4.99/month</p>
        </Reveal>
      </div>

      {/* subtle Blackpool skyline silhouette along the bottom edge */}
      <Image
        src="/images/coastalradio/coast-skyline-band.png"
        alt=""
        aria-hidden="true"
        width={1024}
        height={424}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-auto w-full opacity-15"
      />
    </section>
  )
}
