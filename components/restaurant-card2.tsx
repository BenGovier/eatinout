"use client"

import Image from "next/image"
import { Heart, Ticket, ChevronRight } from "lucide-react"
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
  onClick,
  restaurantId,
  isFavorite = false,
  onHeartClick,
}: RestaurantCardProps) {
  const heroOffer = offers[0]
  const cardWidth = isLarger ? "w-[280px]" : "w-[260px]"
  const [imageError, setImageError] = useState(false)
  const showPlaceholder = !image || imageError

  return (
    <div
      className={`flex-shrink-0 ${cardWidth} group cursor-pointer transition-all hover:scale-[1.02] duration-200`}
      style={{ scrollSnapAlign: "start" }}
      onClick={onClick}
    >
      <div className="bg-gradient-to-br from-[#FFFCF9] to-[#FDF8F4] rounded-3xl shadow-md hover:shadow-xl transition-all overflow-hidden border border-[#E8E4DF]">
        {/* Image area - taller for premium feel */}
        <div className="relative h-[140px] w-full overflow-hidden">
          {showPlaceholder ? (
            <div className="w-full h-full bg-gradient-to-br from-[#FDF8F4] via-[#FAF5F0] to-[#F5EDE6] flex flex-col items-center justify-center relative">
              {/* Subtle pattern */}
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23DC3545' fill-opacity='1'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10S0 14.5 0 20s4.5 10 10 10 10-4.5 10-10zm10 0c0 5.5 4.5 10 10 10s10-4.5 10-10-4.5-10-10-10-10 4.5-10 10z'/%3E%3C/g%3E%3C/svg%3E")`,
              }} />
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#DC3545] to-[#B91C2C] flex items-center justify-center mb-2 shadow-lg shadow-[#DC3545]/20">
                <Ticket className="h-7 w-7 text-white" />
              </div>
              <span className="text-xs text-[#78716C] font-semibold">Voucher code available</span>
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            </>
          )}
          
          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            {offers.length > 0 && (
              <div className="bg-[#1C1917] text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg">
                <Ticket className="h-3.5 w-3.5" />
                MEMBER VOUCHER
              </div>
            )}
            <span className="bg-white/95 backdrop-blur-sm text-[#1C1917] text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shadow-lg">
              Use in venue
            </span>
          </div>
        </div>

        {/* Card body - more depth */}
        <div className="p-4 space-y-2.5">
          {/* Name and heart */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-[#1C1917] text-base line-clamp-1 flex-1">{name}</h3>
            <button 
              className={`transition-all flex-shrink-0 p-1.5 rounded-full ${
                isFavorite
                  ? "text-[#DC3545] bg-[#DC3545]/10"
                  : "text-[#D6D3D1] hover:text-[#DC3545] hover:bg-[#DC3545]/5"
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
          <p className="text-[#78716C] text-xs flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 text-[#A8A29E]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            {location}<span className="text-[#D6D3D1]">·</span>{zipCode}
          </p>

          {/* Offer display - voucher style with dashed border */}
          {heroOffer && (
            <div className="pt-3 border-t-2 border-dashed border-[#E8E4DF]">
              <p className="text-[#DC3545] font-bold text-lg truncate">{heroOffer.discount}</p>
              <p className="text-xs text-[#78716C] mt-0.5">Tap to view your voucher code</p>
            </div>
          )}

          {/* CTA strip - prominent action */}
          <div className="pt-3 border-t border-[#E8E4DF] flex items-center justify-between">
            <span className="text-[#DC3545] font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
              View voucher code
              <ChevronRight className="h-4 w-4" />
            </span>
            <span className="text-[10px] text-[#A8A29E] font-medium">Included with Eatinout</span>
          </div>
        </div>
      </div>
    </div>
  )
}
