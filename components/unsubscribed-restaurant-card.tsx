"use client"

import Image from "next/image"
import { Heart, Ticket, Lock, ChevronRight } from "lucide-react"
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
  location,
  image,
  offers,
  firstOffer,
  isLarger = false,
  onClick
}: UnsubscribedRestaurantCardProps) {
  const cardWidth = isLarger ? "w-[280px]" : "w-[260px]"
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
                fetchPriority="low" 
                loading="lazy"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            </>
          )}
          
          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            {displayOffers.length > 0 && (
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
              className="text-[#D6D3D1] hover:text-[#DC3545] hover:bg-[#DC3545]/5 transition-all flex-shrink-0 p-1.5 rounded-full"
              aria-label="Add to favourites"
            >
              <Heart className="h-4 w-4" />
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
              <p className="text-xs text-[#78716C] mt-0.5">Show voucher code when you visit</p>
            </div>
          )}

          {/* CTA strip - unlock version for unauthenticated users */}
          <div className="pt-3 border-t border-[#E8E4DF] flex items-center justify-between">
            <span className="text-[#DC3545] font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
              <Lock className="h-3.5 w-3.5" />
              Join to view voucher
              <ChevronRight className="h-4 w-4" />
            </span>
            <span className="text-[10px] text-[#A8A29E] font-medium">Included with Eatinout</span>
          </div>
        </div>
      </div>
    </div>
  )
}
