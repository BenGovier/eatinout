"use client"

import Image from "next/image"
import { Reveal } from "@/components/prestonblog/reveal"
import { PrestonCtaButton } from "@/components/prestonblog/preston-cta-button"

/**
 * Closing CTA over a second lifestyle photo with a Coastal purple/black
 * gradient. Co-brand label appears here once more (no logo wall).
 */
export function CoastalFinalCta() {
  return (
    <section className="relative isolate overflow-hidden">
      <Image
        src="/images/coastalradio/final-cta.png"
        alt="Friends toasting together over a shared meal"
        fill
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--cr-deep)]/85 via-[var(--cr-deep)]/80 to-[var(--cr-deep)]/95" />
      <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-[var(--cr-magenta)]/25 blur-[120px]" />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
        <Reveal className="flex flex-col items-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--cr-magenta)]">
            Coastal Radio &times; EatinOut
          </span>
          <h2 className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Ready to eat out for less?
          </h2>
          <p className="mt-4 max-w-xl text-pretty text-lg leading-relaxed text-white/85">
            Start your free trial today and discover local restaurant offers across Blackpool, the Fylde Coast and
            Lancashire.
          </p>
          <div className="mt-8 w-full sm:w-auto">
            <PrestonCtaButton label="Start my 30-day free trial" block className="sm:w-auto" />
          </div>
          <p className="mt-5 text-sm text-white/75">No charge today &bull; Cancel anytime &bull; Then £4.99/month</p>
        </Reveal>
      </div>
    </section>
  )
}
