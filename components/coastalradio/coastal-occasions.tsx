import Image from "next/image"
import { Reveal } from "@/components/prestonblog/reveal"

const tiles = [
  {
    title: "Blackpool nights out",
    image: "/images/coastalradio/local-blackpool-nights.png",
    alt: "Friends enjoying a lively night out in Blackpool",
  },
  {
    title: "Lytham & St Annes",
    image: "/images/coastalradio/local-lytham.png",
    alt: "Couple enjoying a relaxed meal in Lytham St Annes",
  },
  {
    title: "Pubs & family meals",
    image: "/images/coastalradio/local-pubs-family.png",
    alt: "A family enjoying a Sunday roast at a local pub",
  },
]

/**
 * First content section — local relevance, not "do the maths".
 * Three large editorial image tiles with strong overlaid typography.
 * No restaurant names, no deals, no fake discounts.
 * Isolated to the /coastalradio campaign.
 */
export function CoastalOccasions() {
  return (
    <section className="bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-[var(--cr-purple)] sm:text-4xl">
            Great meals. Local places. Smaller bills.
          </h2>
          <p className="mt-3 text-pretty text-lg leading-relaxed text-[var(--eo-muted)]">
            Whether it&apos;s a Friday night in Blackpool, Sunday lunch in Poulton or dinner in Lytham,
            EatinOut helps you spend less when you go out.
          </p>
        </Reveal>

        <div className="mt-9 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {tiles.map((tile, i) => (
            <Reveal key={tile.title} delay={i * 0.1}>
              <div className="group relative aspect-[3/4] overflow-hidden rounded-sm">
                <Image
                  src={tile.image || "/placeholder.svg"}
                  alt={tile.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--cr-deep)]/85 via-[var(--cr-deep)]/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <span className="block h-1 w-9 bg-[var(--cr-magenta)]" />
                  <h3 className="mt-2.5 text-balance text-xl font-extrabold uppercase leading-tight tracking-tight text-white">
                    {tile.title}
                  </h3>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
