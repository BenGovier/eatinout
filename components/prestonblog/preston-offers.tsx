"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Reveal } from "./reveal"
import { OFFER_TYPES, LANCASHIRE_TOWNS, type OfferType } from "./offers-data"

/**
 * Local proof section. Shows the KINDS of offers available (not invented
 * restaurant names) plus the Lancashire towns covered, so ad traffic sees
 * this is genuinely local and varied.
 */
export function PrestonOffers({ offers = OFFER_TYPES }: { offers?: OfferType[] }) {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--eo-red)]">Local to you</p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl md:text-5xl">
            Deals at restaurants across Lancashire
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-[var(--eo-muted)]">
            Find offers across Preston, Blackpool, Blackburn, Burnley, Lytham, Lancaster and more.
          </p>
        </Reveal>

        {/* Towns */}
        <Reveal delay={0.05}>
          <ul className="mt-7 flex flex-wrap justify-center gap-2.5">
            {LANCASHIRE_TOWNS.map((town) => (
              <li
                key={town}
                className="rounded-full bg-[var(--eo-bg)] px-4 py-1.5 text-sm font-semibold text-[var(--eo-ink)] ring-1 ring-black/5"
              >
                {town}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Offer-type cards */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer, i) => (
            <Reveal key={offer.id} delay={(i % 3) * 0.08}>
              <OfferCard offer={offer} />
            </Reveal>
          ))}
        </div>

        <p className="mt-10 text-center text-sm font-medium text-[var(--eo-muted)]">
          New local venues and offers added every week.
        </p>
      </div>
    </section>
  )
}

function OfferCard({ offer }: { offer: OfferType }) {
  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group relative aspect-[4/5] overflow-hidden rounded-3xl shadow-lg shadow-black/10 ring-1 ring-black/5"
    >
      <Image
        src={offer.image || "/placeholder.svg"}
        alt={`${offer.title} — ${offer.saving} with EatinOut`}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
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

      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="text-2xl font-bold tracking-tight text-white">{offer.title}</h3>
        <p className="mt-1.5 text-pretty text-sm leading-snug text-white/85">{offer.blurb}</p>
      </div>
    </motion.article>
  )
}
