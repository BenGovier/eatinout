"use client"

import Image from "next/image"
import { Heart, Ticket, Utensils } from "lucide-react"
import { useState } from "react"

interface Offer {
  title?: string
  totalCodes?: number
  codesRedeemed?: number
  discount?: string
  unlimited?: boolean
  remainingCount?: number
}

interface UnsubscribedRestaurantCardProps {
  name: string
  zipCode: string
  cuisine: string
  location: string
  image: string
  offersCount?: number
  offers?: Offer[]
  firstOffer?: Offer
  isLarger?: boolean
  onClick?: () => void
}

export function UnsubscribedRestaurantCard({
  name,
  zipCode,
  cuisine,
  location,
  image,
  offers,
  firstOffer,
  isLarger = false,
  onClick
}: UnsubscribedRestaurantCardProps) {
  const cardWidth = isLarger ? "w-[260px]" : "w-[240px]"
  const [imageError, setImageError] = useState(false)
  const showPlaceholder = !image || imageError
  
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

  return (
    <div
      className={`flex-shrink-0 ${cardWidth} group cursor-pointer transition-transform hover:scale-[1.01] duration-200`}
      style={{ scrollSnapAlign: "start" }}
      onClick={onClick}
    >
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-[#E8E4DF]">
        <div className="relative h-[130px] w-full overflow-hidden">
          {showPlaceholder ? (
            <div className="w-full h-full bg-gradient-to-br from-[#FAF9F7] to-[#E8E4DF] flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-[#DC3545]/10 flex items-center justify-center mb-2">
                <Utensils className="h-5 w-5 text-[#DC3545]" />
              </div>
              <span className="text-[10px] text-[#78716C] font-medium">Member offer venue</span>
            </div>
          ) : (
            <Image 
              src={image} 
              alt={name} 
              fill 
              className="object-cover" 
              fetchPriority="low" 
              loading="lazy"
              onError={() => setImageError(true)}
            />
          )}
          
          {/* Member offer badge */}
          {displayOffers.length > 0 && (
            <div className="absolute top-2 left-2">
              <div className="bg-[#1C1917] text-white font-medium text-[10px] px-2 py-1 rounded-md flex items-center gap-1">
                <Ticket className="h-3 w-3" />
                MEMBER OFFER
              </div>
            </div>
          )}
        </div>

        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-[#1C1917] text-sm line-clamp-1 flex-1 pr-2">{name}</h3>
            <button 
              className="text-[#D6D3D1] hover:text-[#DC3545] transition-colors flex-shrink-0"
              aria-label="Add to favourites"
            >
              <Heart className="h-4 w-4" />
            </button>
          </div>

          <p className="text-[#78716C] text-xs flex items-center gap-1">
            <span className="inline-block w-3 h-3 text-[#A8A29E]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            {location}<span className="text-[#D6D3D1]">·</span>{zipCode}
          </p>

          {/* Offer display */}
          {heroOffer && (
            <div className="pt-1 border-t border-[#E8E4DF]">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[#DC3545] font-semibold text-sm truncate">{heroOffer.discount}</p>
                  <p className="text-[10px] text-[#78716C]">Show when you visit</p>
                </div>
                {!heroOffer.unlimited && heroOffer.remainingCount && heroOffer.remainingCount > 0 && (
                  <span className="text-[10px] text-[#78716C] bg-[#FAF9F7] px-2 py-0.5 rounded-full">
                    {heroOffer.remainingCount} left
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="text-[10px] text-[#A8A29E]">Included with Eatinout</p>
        </div>
      </div>
    </div>
  )
}
