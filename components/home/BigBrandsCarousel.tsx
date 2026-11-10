import Image from "next/image"
import { Tag } from "lucide-react"

export type BigBrandOffer = {
  id: string
  title: string
  badge: string
  offerImageUrl: string
  brandName: string
  brandLogoUrl?: string | null
}

interface BigBrandsCarouselProps {
  offers?: BigBrandOffer[]
}

export function BigBrandsCarousel({ offers = [] }: BigBrandsCarouselProps) {
  const hasOffers = offers.length > 0

  return (
    <section id="big-brands" aria-labelledby="big-brands-heading" className="scroll-mt-24">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id="big-brands-heading" className="text-xl font-extrabold text-gray-900">
            Big Brands
          </h2>
          <p className="text-sm text-gray-600">Free account to claim. No subscription.</p>
        </div>
        {hasOffers && (
          <a href="#big-brands" className="shrink-0 py-1 text-sm font-semibold text-[#DC3545] hover:underline">
            See all
          </a>
        )}
      </div>

      {hasOffers ? (
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {offers.map((offer) => (
            <li
              key={offer.id}
              className="w-[82%] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="relative aspect-video w-full">
                <Image
                  src={offer.offerImageUrl}
                  alt={offer.title}
                  fill
                  sizes="320px"
                  className="object-cover"
                />
                <span className="absolute left-3 top-3 rounded-md bg-[#DC3545] px-2 py-1 text-xs font-bold text-white">
                  {offer.badge}
                </span>
              </div>
              <div className="flex items-center gap-3 p-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#DC3545]/10">
                  {offer.brandLogoUrl ? (
                    <Image src={offer.brandLogoUrl} alt={`${offer.brandName} logo`} fill sizes="44px" className="object-contain p-1" />
                  ) : (
                    <Tag className="h-5 w-5 text-[#DC3545]" aria-hidden="true" />
                  )}
                </div>
                <p className="line-clamp-2 text-sm font-bold text-gray-900">{offer.title}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#DC3545]/10">
            <Tag className="h-5 w-5 text-[#DC3545]" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Big Brand deals are on their way.</p>
        </div>
      )}
    </section>
  )
}
