"use client"

import Image from "next/image"
import { Heart, Ticket } from "lucide-react"

interface Offer {
  discount: string
  unlimited?: boolean
  remainingCount?: number
}

interface RestaurantCardProps {
  name: string
  cuisine: string
  zipCode: string
  location: string
  image: string
  offers: Offer[]
  isSignedIn?: boolean
  isLarger?: boolean
  showCTA?: boolean
  onClick?: () => void
  // New props for favorites
  restaurantId?: string
  isFavorite?: boolean
  onHeartClick?: (e: React.MouseEvent, restaurantId: string, restaurantName: string) => void
}

export function RestaurantCard({
  name,
  zipCode,
  location,
  image,
  offers,
  isLarger = false,
  showCTA = false,
  onClick,
  restaurantId,
  isFavorite = false,
  onHeartClick,
}: RestaurantCardProps) {
  const heroOffer = offers[0]
  const cardWidth = isLarger ? "w-[260px]" : "w-[240px]"

  return (
    <div
      className={`flex-shrink-0 ${cardWidth} group cursor-pointer transition-transform hover:scale-[1.01] duration-200`}
      style={{ scrollSnapAlign: "start" }}
      onClick={onClick}
    >
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-[#E8E4DF]">
        <div className="relative h-[130px] w-full overflow-hidden">
          <Image src={image || "/placeholder.svg"} alt={name} fill className="object-cover" />
          
          {/* Member offer badge */}
          {offers.length > 0 && (
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
              className={`transition-colors flex-shrink-0 ${
                isFavorite
                  ? "text-[#DC3545]"
                  : "text-[#D6D3D1] hover:text-[#DC3545]"
              }`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (onHeartClick && restaurantId) {
                  onHeartClick(e, restaurantId, name)
                }
              }}
              aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-[#DC3545]" : ""}`} />
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
