"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tag, Heart,Clock } from "lucide-react"

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
  const getRemainingText = () => {
    if (heroOffer?.unlimited) return null
    // if (typeof heroOffer?.remainingCount !== "number") return null
    // if (heroOffer.remainingCount <= 0) return "comingSoon"
    if (typeof heroOffer?.remainingCount !== "number" || heroOffer.remainingCount <= 0) {
      return "comingSoon"
    }
    if (heroOffer.remainingCount === 1) return "Only 1 left!"
    return `${heroOffer.remainingCount} left!`
  }
  const remainingText = getRemainingText()
  const cardWidth = isLarger ? "w-[260px]" : "w-[240px]"

  return (
    <div
      className={`flex-shrink-0 ${cardWidth} group cursor-pointer transition-transform hover:scale-[1.02] duration-200`}
      style={{ scrollSnapAlign: "start" }}
      onClick={onClick}
    >
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100">
        <div className="relative h-[130px] w-full overflow-hidden">
          <Image src={image || "/placeholder.svg"} alt={name} fill className="object-cover" />
          
          {/* Hero offer badge in top-left corner */}
          {offers.length > 0 && (
          <div className="absolute top-2 left-0 flex items-stretch">
            <div className="bg-[#eb221c] text-white font-semibold text-xs px-2 py-1">
              {heroOffer?.discount}
            </div>
            {/* {getRemainingText() && (
              <div className="bg-white text-[#eb221c] font-medium text-xs px-2 py-1">
                {getRemainingText()}
              </div>
            )} */}
            {!heroOffer?.unlimited && remainingText && (
              remainingText === "comingSoon" ? (
                <div className="bg-white text-gray-500 font-medium text-xs px-2 py-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  More coming soon
                </div>
              ) : (
                <div className="bg-white text-[#eb221c] font-medium text-xs px-2 py-1">
                  {remainingText}
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
              className={`transition-colors flex-shrink-0 ${
                isFavorite
                  ? "text-[#eb221c]"
                  : "text-gray-300 hover:text-[#eb221c]"
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
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-[#eb221c]" : ""}`} />
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

          <div className="overflow-x-auto scrollbar-hide -mx-3 px-3">
            <div className="flex items-center gap-1.5">
              {offers.map((offer, index) => {
                // const remaining =
                //   offer.unlimited || typeof offer.remainingCount !== "number"
                //     ? null
                //     : offer.remainingCount > 0
                //       ? offer.remainingCount
                //       : null
                const isComingSoon = !offer.unlimited && 
                (typeof offer.remainingCount !== "number" || offer.remainingCount <= 0)
            
                const remaining = !offer.unlimited && 
                  typeof offer.remainingCount === "number" && 
                  offer.remainingCount > 0
                    ? offer.remainingCount
                    : null
                return (
                  <div 
                    key={index}
                    className="flex-shrink-0 flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-2 py-1"
                  >
                    <Tag className="h-2.5 w-2.5 text-[#eb221c]" />
                    <span className="text-[10px] font-medium text-gray-700 whitespace-nowrap">{offer.discount}</span>
                    {remaining !== null && (
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {remaining} left
                      </span>
                    )}
                    {isComingSoon && (
                      <span className="text-[10px] text-orange-500 whitespace-nowrap">
                        More coming soon
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {showCTA && (
            <Button className="w-full bg-[#eb221c] hover:bg-[#eb221c]/90 text-white font-semibold mt-2">
              Unlock ALL Offers
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
