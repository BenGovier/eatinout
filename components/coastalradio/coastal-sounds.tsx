import Image from "next/image"
import { Reveal } from "@/components/prestonblog/reveal"

const rows = [
  { label: "Pub food", image: "/images/coastalradio/sounds-pub-food.png", alt: "Hearty British pub food and a pint" },
  { label: "Date night", image: "/images/coastalradio/occasion-date-night.png", alt: "A couple on a date night" },
  { label: "Family dinner", image: "/images/coastalradio/occasion-family.png", alt: "A family sharing a meal" },
  {
    label: "Drinks & small plates",
    image: "/images/coastalradio/sounds-drinks.png",
    alt: "Cocktails, wine and sharing plates",
  },
]

/**
 * "What sounds good tonight?" — a Coastal Radio nod (sounds good / on air).
 * Editorial full-width image strips with strong overlaid type, not cards.
 * Isolated to the /coastalradio campaign.
 */
export function CoastalSounds() {
  return (
    <section className="bg-[var(--cr-pale)] py-14 sm:py-16">
      <div className="mx-auto max-w-4xl px-5 sm:px-6">
        <Reveal className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--cr-magenta)]">On the menu</p>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-[var(--cr-purple)] sm:text-4xl">
            What sounds good tonight?
          </h2>
        </Reveal>

        <div className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <Reveal key={row.label} delay={i * 0.08}>
              <div className="group relative h-24 overflow-hidden rounded-sm sm:h-28">
                <Image
                  src={row.image || "/placeholder.svg"}
                  alt={row.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--cr-deep)]/90 via-[var(--cr-deep)]/45 to-transparent" />
                <div className="absolute inset-y-0 left-0 flex items-center pl-5 sm:pl-7">
                  <span className="h-8 w-1 bg-[var(--cr-magenta)]" />
                  <h3 className="ml-4 text-balance text-xl font-extrabold uppercase tracking-tight text-white sm:text-2xl">
                    {row.label}
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
