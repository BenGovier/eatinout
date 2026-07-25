"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { MapPin, Check } from "lucide-react"
import { Reveal } from "./reveal"
import { SAMPLE_PRESTON_OFFERS, type PrestonOffer } from "./offers-data"

/**
 * Live-offers showcase. Food photography dominates; the saving dominates.
 * Pass `offers` to inject real live Preston offers later — the layout is
 * unchanged. Defaults to local sample content.
 */
export function PrestonOffers({ offers = SAMPLE_PRESTON_OFFERS }: { offers?: PrestonOffer[] }) {
  return (
    <section className="relative bg-[var(--eo-bg)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-[var(--eo-red)] shadow-sm ring-1 ring-black/5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--eo-red)] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--eo-red)]" />
            </span>
            Live offers in Preston
          </span>
          <h2 className="mt-5 text-balance text-4xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-5xl">
            Tonight&apos;s table, half the bill
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-[var(--eo-muted)]">
            From candlelit date nights to lazy weekend brunches — here&apos;s a taste of what members are enjoying
            across Preston right now.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer, i) => (
            <Reveal key={offer.id} delay={(i % 3) * 0.08}>
              <OfferCard offer={offer} />
            </Reveal>
          ))}
        </div>

        <p className="mt-10 text-center text-sm font-medium text-[var(--eo-muted)]">
          New independent venues added across Preston every week.
        </p>
      </div>
    </section>
  )
}

function OfferCard({ offer }: { offer: PrestonOffer }) {
  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group relative aspect-[4/5] overflow-hidden rounded-3xl shadow-lg shadow-black/10 ring-1 ring-black/5"
    >
      <Image
        src={offer.image || "/placeholder.svg"}
        alt={`${offer.dish} at ${offer.name}, ${offer.area}, Preston`}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
      {/* Bottom gradient for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

      {/* Saving badge — dominant */}
      <div className="absolute left-4 top-4 rounded-full bg-[var(--eo-red)] px-3.5 py-1.5 text-sm font-bold text-white shadow-lg">
        {offer.saving}
      </div>
      {offer.tag ? (
        <div className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[var(--eo-ink)] shadow-sm backdrop-blur-sm">
          {offer.tag}
        </div>
      ) : null}

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/70">
          <MapPin className="h-3.5 w-3.5 text-[var(--eo-teal)]" />
          {offer.cuisine} · {offer.area}
        </p>
        <h3 className="mt-1 text-2xl font-bold tracking-tight text-white">{offer.name}</h3>
        <p className="mt-1.5 text-pretty text-sm leading-snug text-white/85">{offer.dish}</p>
        <p className="mt-3 flex items-center gap-1.5 border-t border-white/15 pt-3 text-xs font-medium text-white/70">
          <Check className="h-3.5 w-3.5 text-[var(--eo-teal)]" />
          Available with EatinOut
        </p>
      </div>
    </motion.article>
  )
}
