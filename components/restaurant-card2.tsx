"use client"

import Image from "next/image"
import { Heart, Ticket, Utensils, ChevronRight } from "lucide-react"
import { useState } from "react"

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
  const [imageError, setImageError] = useState(false)
  const showPlaceholder = !image || imageError

  return (
    <div
      className={`flex-shrink-0 ${cardWidth} group cursor-pointer transition-transform hover:scale-[1.01] duration-200`}
      style={{ scrollSnapAlign: "start" }}
      onClick={onClick}
    >
      <div className="bg-[#FFFCF9] rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-[#E8E4DF]">
        {/* Image area */}
        <div className="relative h-[130px] w-full overflow-hidden">
          {showPlaceholder ? (
            <div className="w-full h-full bg-gradient-to-br from-[#FDF8F4] via-[#FAF5F0] to-[#F5EDE6] flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[#DC3545]/10 flex items-center justify-center mb-2">
                <Ticket className="h-6 w-6 text-[#DC3545]" />
              </div>
              <span className="text-[11px] text-[#78716C] font-medium">Voucher code available</span>
            </div>
          ) : (
            <>
              <Image 
                src={image} 
                alt={name} 
                fill 
                className="object-cover" 
                onError={() => setImageError(true)}
              />
              {/* Dark gradient overlay for better badge visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </>
          )}
          
          {/* Top badges */}
          <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
            {offers.length > 0 && (
              <div className="bg-[#1C1917] text-white font-semibold text-[10px] px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                <Ticket className="h-3 w-3" />
                MEMBER VOUCHER
              </div>
            )}
            <span className="bg-white/90 backdrop-blur-sm text-[#1C1917] text-[9px] font-medium px-2 py-1 rounded-md shadow-sm">
              Use in venue
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="p-3 space-y-2">
          {/* Name and heart */}
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

          {/* Location */}
          <p className="text-[#78716C] text-xs flex items-center gap-1">
            <span className="inline-block w-3 h-3 text-[#A8A29E]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            {location}<span className="text-[#D6D3D1]">·</span>{zipCode}
          </p>

          {/* Offer display with dashed separator */}
          {heroOffer && (
            <div className="pt-2 border-t border-dashed border-[#E8E4DF]">
              <p className="text-[#DC3545] font-bold text-base truncate">{heroOffer.discount}</p>
              <p className="text-[11px] text-[#78716C] mt-0.5">Tap to view your voucher code</p>
            </div>
          )}

          {/* CTA strip */}
          <div className="pt-2 border-t border-[#E8E4DF] flex items-center justify-between">
            <span className="text-[#DC3545] font-semibold text-xs flex items-center gap-1 group-hover:gap-1.5 transition-all">
              View voucher code
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
            <span className="text-[10px] text-[#A8A29E]">Included with Eatinout</span>
          </div>
        </div>
      </div>
    </div>
  )
}
