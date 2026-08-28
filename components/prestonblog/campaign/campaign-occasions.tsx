import Image from "next/image"
import { Reveal } from "@/components/prestonblog/reveal"

/**
 * "Sell occasions, not restaurants" section.
 * A 2x2 image grid of eating-out occasions — photography leads, no
 * restaurant names, discounts or locations.
 */
const OCCASIONS = [
  { title: "Date night", src: "/images/prestonblog/campaign/occasion-date-night.png" },
  { title: "Family meal", src: "/images/prestonblog/campaign/occasion-family.png" },
  { title: "Food with friends", src: "/images/prestonblog/campaign/occasion-friends.png" },
  { title: "Weekend lunch", src: "/images/prestonblog/campaign/occasion-weekend-lunch.png" },
]

export function CampaignOccasions() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal className="max-w-xl">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl">
            More reasons to eat out.
          </h2>
          <p className="mt-3 text-pretty text-lg leading-relaxed text-[var(--eo-muted)]">
            Whatever you&apos;re in the mood for, EatinOut helps make going out cost less.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4">
          {OCCASIONS.map((o, i) => (
            <Reveal key={o.title} delay={i * 0.08}>
              <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl sm:aspect-square">
                <Image
                  src={o.src || "/placeholder.svg"}
                  alt={o.title}
                  fill
                  sizes="(min-width: 640px) 45vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <h3 className="absolute inset-x-0 bottom-0 p-4 text-lg font-bold text-white sm:text-xl">
                  {o.title}
                </h3>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
