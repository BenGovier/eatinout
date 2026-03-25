"use client"

import Image from "next/image"
import { Heart, Tag,Clock } from "lucide-react"

interface Offer {
  title?: string
  totalCodes?: number
  codesRedeemed?: number
  discount?: string
  unlimited?: boolean
  remainingCount?: number
}

interface UnsubscribedAllRestaurantsCardProps {
  name: string
  zipCode: string
  cuisine: string
  location: string
  image: string
  offersCount?: number
  offers?: Offer[]
  firstOffer?: Offer
  onClick?: () => void
}

export function UnsubscribedAllRestaurantsCard({
  name,
  zipCode,
  cuisine,
  location,
  image,
  offers,
  firstOffer,
  onClick
}: UnsubscribedAllRestaurantsCardProps) {
  const displayOffers = (offers?.length ? offers : firstOffer ? [firstOffer] : [])
    .map((offer) => {
      const discount = offer.discount ?? offer.title
      if (!discount) return null
      const unlimited = typeof offer.unlimited === "boolean" ? offer.unlimited : !offer.totalCodes
      let remainingCount: number | undefined
      if (typeof offer.remainingCount === "number") {
        remainingCount = offer.remainingCount
      } else if (offer.totalCodes) {
        const remaining = offer.totalCodes - (offer.codesRedeemed || 0)
        remainingCount = remaining > 0 ? remaining : undefined
      }
      return { discount, unlimited, remainingCount }
    })
    .filter((offer): offer is { discount: string; unlimited: boolean; remainingCount?: number } => Boolean(offer))

  const heroOffer = displayOffers[0]
  const discount = heroOffer?.discount
  const remaining = heroOffer && !heroOffer.unlimited ? heroOffer.remainingCount : undefined

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 cursor-pointer" onClick={onClick}>
      <div className="relative h-[140px] w-full overflow-hidden">
        <Image src={image || "/placeholder.svg"} alt={name} fill className="object-cover" fetchPriority="low" loading="lazy" />

        {discount && (
          <div className="absolute top-2 left-0 flex items-stretch">
            <div className="bg-[#eb221c] text-white font-semibold text-xs px-2 py-1">
              {discount}
            </div>
            {/* {remaining && (
              <div className="bg-white text-[#eb221c] font-medium text-xs px-2 py-1">
                {remaining} left!
              </div>
            )} */}
            {!heroOffer?.unlimited && (
              remaining && remaining > 0 ? (
                <div className="bg-white text-[#eb221c] font-medium text-xs px-2 py-1">
                  {remaining} left!
                </div>
              ) : (
                <div className="bg-white text-gray-500 font-medium text-xs px-2 py-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  More coming soon
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="p-3 space-y-1.5 relative">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 flex-1 pr-2">{name}</h3>
          <button
            className="text-gray-300 hover:text-[#eb221c] transition-colors flex-shrink-0"
            aria-label="Add to favourites"
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>

        <p className="text-gray-500 text-xs flex items-center gap-1">
          <span className="inline-block w-3 h-3 text-gray-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          {location}<span className="text-gray-400">·</span>{zipCode}
        </p>

        {displayOffers.length > 0 && (
          <div className="overflow-x-auto scrollbar-hide -mx-3 px-3">
            <div className="flex items-center gap-1.5">
              {displayOffers.map((offer, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-2 py-1"
                >
                  <Tag className="h-2.5 w-2.5 text-[#eb221c]" />
                  <span className="text-[10px] font-medium text-gray-700 whitespace-nowrap">
                    {offer?.discount}
                  </span>
                  {/* {!offer.unlimited && offer.remainingCount && offer.remainingCount > 0 && (
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {offer.remainingCount} left
                    </span>
                  )} */}
                  {!offer?.unlimited && (
                      offer?.remainingCount && offer.remainingCount > 0 ? (
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {offer.remainingCount} left
                        </span>
                      ) : (
                        <span className="text-[10px] text-orange-500 whitespace-nowrap">
                          More coming soon
                        </span>
                      )
                    )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
