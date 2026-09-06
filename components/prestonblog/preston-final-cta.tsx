"use client"

import Image from "next/image"
import { Ban, CalendarCheck, Clock } from "lucide-react"
import { PrestonCtaButton } from "./preston-cta-button"
import { Reveal } from "./reveal"

/**
 * Emotional closing section — full-bleed lifestyle image, the value already
 * seen. Objection-reducing trust chips sit right under the CTA.
 */
export function PrestonFinalCta() {
  return (
    <section className="relative isolate overflow-hidden">
      <Image
        src="/images/prestonblog/moment-family.png"
        alt="A family enjoying Sunday lunch together at a Preston restaurant"
        fill
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/55" />

      <div className="relative mx-auto max-w-3xl px-5 py-24 text-center sm:py-32">
        <Reveal>
          <h2 className="text-balance text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            Ready to start saving?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-white/85">
            Start your free 30-day trial today. Enjoy your first discounted meal this week. Plus earn your FREE £25 M&amp;S
            Gift Card.
          </p>

          <p className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-base font-medium text-white/85">
            Use code
            <span className="inline-flex items-center rounded-md border border-dashed border-[var(--eo-gold-light)]/70 bg-[var(--eo-gold-light)]/15 px-2 py-0.5 font-mono text-base font-bold uppercase tracking-widest text-[var(--eo-gold-light)]">
              MANDS25
            </span>
            at sign-up
          </p>

          <div className="mt-9 flex justify-center">
            <PrestonCtaButton
              label="Start my free trial"
              className="[&_a]:bg-white [&_a]:px-10 [&_a]:text-[var(--eo-red)] [&_a]:shadow-black/20 [&_a:hover]:bg-white/90"
            />
          </div>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-medium text-white/85">
            <li className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-[var(--eo-teal)]" /> No charge today
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--eo-teal)]" /> Less than a minute to join
            </li>
            <li className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-[var(--eo-teal)]" /> Cancel anytime
            </li>
          </ul>

          <p className="mt-6 text-sm text-white/65">450+ Lancashire offers. Use it as often as you like.</p>
        </Reveal>
      </div>
    </section>
  )
}
