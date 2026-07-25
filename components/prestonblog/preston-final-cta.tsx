"use client"

import Image from "next/image"
import { Ban, CalendarCheck, Clock } from "lucide-react"
import { PrestonCtaButton } from "./preston-cta-button"
import { Reveal } from "./reveal"
import { displayFont } from "@/app/prestonblog/fonts"

/**
 * Emotional closing section — full-bleed lifestyle image, the value already
 * seen. Objection-reducing trust chips sit right under the CTA.
 */
export function PrestonFinalCta() {
  return (
    <section className="relative isolate overflow-hidden">
      <Image
        src="/images/prestonblog/lifestyle-friends.png"
        alt="Friends toasting over dinner at a Preston restaurant"
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/55" />

      <div className="relative mx-auto max-w-3xl px-5 py-24 text-center sm:py-32">
        <Reveal>
          <h2 className={`${displayFont.className} text-balance text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl`}>
            Your next meal could cost half as much
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-white/85">
            Join today and enjoy your first 30 days completely free. Start saving at restaurants right across Preston.
          </p>

          <div className="mt-9 flex justify-center">
            <PrestonCtaButton
              label="Start my free month"
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

          <p className="mt-6 text-sm text-white/65">Then just £4.99 a month. Works the moment you join.</p>
        </Reveal>
      </div>
    </section>
  )
}
