import Image from "next/image"
import { PrestonCtaButton } from "@/components/prestonblog/preston-cta-button"

/**
 * Split campaign hero — NOT a full-screen background photo.
 * Desktop: left ~45% Coastal-purple copy panel, right ~55% layered local
 * image composition (main lifestyle photo + overlapping Fylde Coast cue).
 * Mobile: purple panel first, image composition immediately below.
 * Isolated to the /coastalradio campaign.
 */
export function CoastalHero() {
  return (
    <section className="grid lg:grid-cols-[45fr_55fr]">
      {/* LEFT — purple campaign panel */}
      <div className="relative overflow-hidden bg-[var(--cr-purple)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[var(--cr-magenta)] opacity-30 blur-3xl"
        />
        <div className="relative mx-auto flex max-w-xl flex-col justify-center px-6 py-12 sm:px-10 lg:min-h-[560px] lg:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--cr-pink)]">
            Blackpool &amp; the Fylde Coast
          </p>

          <h1 className="mt-4 text-balance text-[2.5rem] font-extrabold leading-[1.02] tracking-tight text-white sm:text-5xl">
            Eat out for less.
          </h1>

          <p className="mt-4 text-pretty text-lg font-medium leading-relaxed text-white/90">
            Save up to 50% at participating local restaurants.
          </p>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-white/70">
            From Blackpool and Poulton to Lytham, St Annes, Cleveleys and beyond.
          </p>

          <p className="mt-6 text-base font-bold text-white">
            30 days free. <span className="font-medium text-white/75">Cancel anytime.</span>
          </p>

          <div className="mt-5">
            <PrestonCtaButton label="Start my free trial" />
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-white/70">
            <li>No charge today</li>
            <li aria-hidden="true" className="text-white/30">&bull;</li>
            <li>Then £4.99/month</li>
            <li aria-hidden="true" className="text-white/30">&bull;</li>
            <li>Cancel anytime</li>
          </ul>
        </div>
      </div>

      {/* RIGHT — layered local image composition */}
      <div className="relative min-h-[380px] bg-[var(--cr-deep)] sm:min-h-[440px] lg:min-h-[560px]">
        <Image
          src="/images/coastalradio/hero-main.png"
          alt="Friends enjoying a night out at a Fylde Coast pub-restaurant"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 55vw"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-tr from-[var(--cr-purple)]/45 via-transparent to-transparent"
        />

        {/* overlapping Fylde Coast cue, magenta framed */}
        <div className="absolute bottom-4 left-4 w-[42%] max-w-[220px] overflow-hidden rounded-sm shadow-2xl ring-2 ring-[var(--cr-magenta)] sm:bottom-6 sm:left-6 lg:w-[38%]">
          <div className="relative aspect-[4/3]">
            <Image
              src="/images/coastalradio/hero-coast.png"
              alt="Blackpool seafront and Tower at dusk"
              fill
              sizes="220px"
              className="object-cover"
            />
          </div>
          <p className="bg-[var(--cr-purple)] px-2.5 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white">
            Right here on the Fylde Coast
          </p>
        </div>
      </div>
    </section>
  )
}
