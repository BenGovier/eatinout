"use client"

import Image from "next/image"
import { Reveal } from "@/components/prestonblog/reveal"

const TILES = [
  { label: "Date night", src: "/images/coastalradio/occasion-date-night.png" },
  { label: "Family meal", src: "/images/coastalradio/occasion-family.png" },
  { label: "Food with friends", src: "/images/coastalradio/occasion-friends.png" },
  { label: "Weekend lunch", src: "/images/coastalradio/occasion-weekend-lunch.png" },
]

/**
 * Sells occasions, not specific deals — four lifestyle tiles, no offers.
 */
export function CoastalOccasions() {
  return (
    <section className="bg-[var(--eo-bg)] py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl">
            What are you in the mood for?
          </h2>
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
          {TILES.map((tile, i) => (
            <Reveal key={tile.label} delay={i * 0.08}>
              <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl sm:aspect-[4/3]">
                <Image
                  src={tile.src || "/placeholder.svg"}
                  alt={tile.label}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--cr-deep)]/80 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 text-base font-bold uppercase tracking-wide text-white sm:bottom-4 sm:left-4 sm:text-lg">
                  {tile.label}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
