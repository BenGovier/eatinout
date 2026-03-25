"use client"

import { memo, useState } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Lock, ChevronRight, ChevronLeft } from "lucide-react"

type Category = {
  id: string
  name: string
}

type OfferData = {
  id: string
  title: string
  tags: string[]
}

type Restaurant = {
  id: string
  name: string
  zipCode?: string
  area: string | string[]
  dealsCount: number
  offers: OfferData[]
  imageUrl: string
  category: Category[]
  location?: string
  rating?: number
  dineIn?: boolean
  dineOut?: boolean
  priceRange?: string
  openingHours?: string
  deliveryAvailable?: boolean
}

type AreaOption = {
  value: string
  label: string
}

interface RestaurantListingCardProps {
  restaurant: {
    id: string
    name: string
    zipCode?: string
    area: string | string[]
    dealsCount: number
    offers: OfferData[]
    imageUrl: string
    category: Category[]
    [key: string]: any // Allow additional properties
  }
  areasList: AreaOption[]
  isAuthenticated: boolean
  onUnlockClick?: (restaurant: any) => void
  onNavigate: (restaurantId: string, offerId?: string) => void
  onSwipeClick: (e: React.MouseEvent) => void
  mapDaysToDisplayFn: (tags: string[]) => string[]
  getDayLabelFn: (days: string[]) => string
  getAreaNamesFn: (areaData: string | string[], areasList: AreaOption[]) => string
  showUnlock?: boolean // Whether to show "Unlock" text and lock icon
}

// Day mapping constant
const DAY_MAP: { [key: string]: string } = {
  'monday': 'Mon',
  'tuesday': 'Tue',
  'wednesday': 'Wed',
  'thursday': 'Thu',
  'friday': 'Fri',
  'saturday': 'Sat',
  'sunday': 'Sun'
}

export const RestaurantListingCard = memo(({
  restaurant,
  areasList,
  isAuthenticated,
  onUnlockClick,
  onNavigate,
  onSwipeClick,
  mapDaysToDisplayFn,
  getDayLabelFn,
  getAreaNamesFn,
  showUnlock = false
}: RestaurantListingCardProps) => {
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0)

  if (!restaurant || !restaurant.id) {
    return null
  }

  const restaurantName = restaurant.name || "Unknown Restaurant"
  const restaurantcity = restaurant.city || "Unknown city"
  const restaurantPostcode = restaurant.zipCode || "Unknown PostCode"
  const restaurantImage = restaurant.imageUrl || "/placeholder.svg"
  const dealsCount = restaurant.dealsCount || 0
  const categories = Array.isArray(restaurant.category) ? restaurant.category : []
  const areaNames = getAreaNamesFn(restaurant.area, areasList)
  const offers = restaurant?.offers || []
  const hasMultipleOffers = offers.length > 1
  const currentOffer = offers[currentOfferIndex]

  const handlePrevOffer = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentOfferIndex((prev) => (prev === 0 ? offers.length - 1 : prev - 1))
  }

  const handleNextOffer = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentOfferIndex((prev) => (prev === offers.length - 1 ? 0 : prev + 1))
  }

  const handleOfferClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAuthenticated && onUnlockClick) {
      onUnlockClick(restaurant)
    } else if (currentOffer) {
      onNavigate(restaurant.id, currentOffer.id)
    }
  }

  return (
    <Card className="overflow-hidden relative p-0 w-full h-full flex flex-col">
      <div className="relative cursor-pointer group w-full h-48 overflow-hidden flex-shrink-0" onClick={() => {
        if (!isAuthenticated && onUnlockClick) {
          onUnlockClick(restaurant)
        } else {
          onNavigate(restaurant.id)
        }
      }}>
        <Image
          src={restaurantImage}
          alt={restaurantName}
          width={400}
          height={192}
          className="w-full h-full object-cover"
          loading="lazy"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          quality={75}
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjE5MiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjE5MiIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg=="
          style={{ objectFit: 'cover' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = "/placeholder.svg"
          }}
        />
        {dealsCount > 0 && (
          <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
            <Badge className="bg-primary text-white border-0 font-semibold shadow-lg">
              {dealsCount} {dealsCount === 1 ? "Offer" : "Offers"}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <div>
          <h3 className="font-semibold text-base leading-tight mb-1 line-clamp-1">{restaurantName}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="line-clamp-1">{restaurantcity} &nbsp;({restaurantPostcode})</span>
          </div>
          <div className="flex gap-1.5 mb-3 flex-wrap items-center">
            {categories.length > 0 ? (
              <>
                {categories.slice(0, 2).map((cat: { id: string; name: string }) => (
                  <Badge
                    key={cat.id}
                    variant="secondary"
                    className="text-xs bg-accent text-foreground"
                  >
                    {cat.name || "Category"}
                  </Badge>
                ))}
                {categories.length > 2 && (
                  <Badge variant="secondary" className="text-xs bg-accent text-foreground">
                    +{categories.length - 2} more
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant="secondary" className="text-xs bg-accent text-foreground">
                Restaurant
              </Badge>
            )}
          </div>
        </div>

        {offers.length > 0 && currentOffer && (
          <div className="relative flex items-center gap-2 pt-1 mt-auto">
            {hasMultipleOffers && (
              <button
                onClick={handlePrevOffer}
                className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1 shadow-md hover:bg-gray-50 transition-colors flex-shrink-0"
                aria-label="Previous offer"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
            )}

            <div className="flex items-center gap-2 flex-1 min-w-0 px-6">
              {/* Offer availability badge */}
              {currentOffer.isUnlimited || !currentOffer.totalCodes ? (
                <Badge
                  variant="outline"
                  className="border-gray-300 text-gray-600 bg-gray-50 text-xs font-medium px-2.5 py-1 whitespace-nowrap flex-shrink-0"
                >
                  unlimited
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-[#DC3545] text-[#DC3545] bg-[#FFF5F5] text-xs font-medium px-2.5 py-1 whitespace-nowrap flex-shrink-0"
                >
                  {currentOffer.codesRedeemed !== undefined
                    ? `${currentOffer.totalCodes - currentOffer.codesRedeemed} left`
                    : `${currentOffer.totalCodes} left`}
                </Badge>
              )}


              {/* Main offer badge - clickable with auto-scrolling text */}
              <button
                onClick={handleOfferClick}
                className="bg-[#DC3545] hover:bg-[#DC3545]/90 text-white font-bold text-sm px-3 py-2 rounded-md border-0 cursor-pointer transition-all hover:scale-105 min-w-0 flex-1 text-center overflow-hidden relative h-[36px] flex items-center justify-center"
                title={currentOffer.title || 'View Offer'}
              >
                <div className="w-full overflow-hidden relative h-full flex items-center">
                  {currentOffer.title && currentOffer.title.length > 25 ? (
                    <div
                      className="flex whitespace-nowrap "
                      style={{
                        width: '200%',
                        // animation: 'scroll-text 10s linear infinite'
                      }}
                    >
                      <span className="inline-block pr-8 flex-shrink-0">{currentOffer.title}</span>
                      <span className="inline-block pr-8 flex-shrink-0">{currentOffer.title}</span>
                    </div>
                  ) : (
                    <span className="block truncate w-full">{currentOffer.title || 'View Offer'}</span>
                  )}
                </div>
              </button>
            </div>

            {hasMultipleOffers && (
              <button
                onClick={handleNextOffer}
                className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1 shadow-md hover:bg-gray-50 transition-colors flex-shrink-0"
                aria-label="Next offer"
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            )}
          </div>
        )}

        {/* Offer indicators (dots) */}
        {hasMultipleOffers && (
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {offers.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentOfferIndex(index)
                }}
                className={`h-1.5 rounded-full transition-all ${index === currentOfferIndex ? "w-4 bg-[#DC3545]" : "w-1.5 bg-gray-300"
                  }`}
                aria-label={`Go to offer ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
})

RestaurantListingCard.displayName = 'RestaurantListingCard'