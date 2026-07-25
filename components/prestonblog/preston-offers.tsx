import Image from "next/image"
import { MapPin, Check } from "lucide-react"
import { Reveal } from "./reveal"

interface Offer {
  name: string
  image: string
  badge: string
  description: string
  location: string
  distance: string
}

const offers: Offer[] = [
  {
    name: "The Grill House",
    image: "/images/prestonblog/restaurant-steak.png",
    badge: "50% OFF",
    description: "Premium steaks & fine dining in the heart of the city.",
    location: "Preston City Centre",
    distance: "0.4 miles away",
  },
  {
    name: "Bella Cucina",
    image: "/images/prestonblog/restaurant-italian.png",
    badge: "2 FOR 1",
    description: "Authentic handmade Italian pasta & wood-fired classics.",
    location: "Fishergate, Preston",
    distance: "0.7 miles away",
  },
  {
    name: "The Copper Bar",
    image: "/images/prestonblog/restaurant-cocktails.png",
    badge: "25% OFF",
    description: "Craft cocktails & small plates in a stylish setting.",
    location: "Winckley Square",
    distance: "0.9 miles away",
  },
]

export function PrestonOffers() {
  return (
    <section className="bg-[var(--eo-bg)] py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="text-balance text-center text-3xl font-extrabold tracking-tight text-[var(--eo-ink)] sm:text-4xl">
            Popular Preston Offers
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-pretty text-center text-base text-[var(--eo-muted)]">
            A taste of the exclusive discounts waiting for you the moment you join.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer, i) => (
            <Reveal key={offer.name} delay={i * 0.1}>
              <article className="group h-full overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/10">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={offer.image || "/placeholder.svg"}
                    alt={offer.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-[var(--eo-red)] px-3 py-1 text-sm font-bold text-white shadow-lg">
                    {offer.badge}
                  </span>
                  {/* Logo placeholder */}
                  <div className="absolute -bottom-6 right-5 flex h-12 w-12 items-center justify-center rounded-xl border border-black/5 bg-white text-sm font-bold text-[var(--eo-ink)] shadow-md">
                    {offer.name.charAt(0)}
                  </div>
                </div>

                <div className="p-5 pt-7">
                  <h3 className="text-lg font-bold text-[var(--eo-ink)]">{offer.name}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--eo-muted)]">
                    {offer.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-sm text-[var(--eo-muted)]">
                    <MapPin className="h-4 w-4 shrink-0 text-[var(--eo-teal)]" />
                    <span>{offer.location}</span>
                    <span aria-hidden className="text-black/20">
                      •
                    </span>
                    <span>{offer.distance}</span>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--eo-teal-100)] px-3 py-1 text-xs font-semibold text-[var(--eo-teal)]">
                    <Check className="h-3 w-3" />
                    Available with EatinOut
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
