"use client"

import { memo, useState } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Lock, ChevronRight, ChevronLeft, Ticket } from "lucide-react"

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
  const restaurantImage = restaurant.imageUrl || ""
  const dealsCount = restaurant.dealsCount || 0
  const categories = Array.isArray(restaurant.category) ? restaurant.category : []
  const areaNames = getAreaNamesFn(restaurant.area, areasList)
  const offers = restaurant?.offers || []
  const hasMultipleOffers = offers.length > 1
  const currentOffer = offers[currentOfferIndex]
  const showPlaceholder = !restaurantImage

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
    <Card className="overflow-hidden relative p-0 w-full h-full flex flex-col bg-[#FFFCF9] border-[#E8E4DF]">
      {/* Image area */}
      <div className="relative cursor-pointer group w-full h-48 overflow-hidden flex-shrink-0" onClick={() => {
        if (!isAuthenticated && onUnlockClick) {
          onUnlockClick(restaurant)
        } else {
          onNavigate(restaurant.id)
        }
      }}>
        {showPlaceholder ? (
          <div className="w-full h-full bg-gradient-to-br from-[#FDF8F4] via-[#FAF5F0] to-[#F5EDE6] flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-[#DC3545]/10 flex items-center justify-center mb-2">
              <Ticket className="h-7 w-7 text-[#DC3545]" />
            </div>
            <span className="text-xs text-[#78716C] font-medium">Voucher code available</span>
          </div>
        ) : (
          <>
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
                target.style.display = 'none'
              }}
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </>
        )}

        {/* Top badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          {dealsCount > 0 && (
            <div className="bg-[#1C1917] text-white font-semibold text-[10px] px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
              <Ticket className="h-3 w-3" />
              MEMBER VOUCHER
            </div>
          )}
          <Badge className="bg-white/90 backdrop-blur-sm text-[#1C1917] border-0 text-[9px] font-medium shadow-sm hover:bg-white/90">
            Use in venue
          </Badge>
        </div>
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
          <div className="relative flex items-center gap-2 pt-2 mt-auto border-t border-dashed border-[#E8E4DF]">
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
              {/* Main offer badge - clickable */}
              <button
                onClick={handleOfferClick}
                className="bg-[#DC3545] hover:bg-[#DC3545]/90 text-white font-bold text-sm px-3 py-2 rounded-md border-0 cursor-pointer transition-all hover:scale-105 min-w-0 flex-1 text-center overflow-hidden relative h-[36px] flex items-center justify-center"
                title={currentOffer.title || 'View Voucher'}
              >
                <div className="w-full overflow-hidden relative h-full flex items-center">
                  {currentOffer.title && currentOffer.title.length > 25 ? (
                    <div
                      className="flex whitespace-nowrap"
                      style={{ width: '200%' }}
                    >
                      <span className="inline-block pr-8 flex-shrink-0">{currentOffer.title}</span>
                      <span className="inline-block pr-8 flex-shrink-0">{currentOffer.title}</span>
                    </div>
                  ) : (
                    <span className="block truncate w-full">{currentOffer.title || 'View Voucher'}</span>
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

        {/* CTA footer */}
        <div className="pt-2 border-t border-[#E8E4DF] flex items-center justify-between mt-auto">
          <span className="text-[#DC3545] font-semibold text-xs flex items-center gap-1">
            {!isAuthenticated ? (
              <>
                <Lock className="h-3 w-3" />
                Unlock voucher code
              </>
            ) : (
              <>View voucher code</>
            )}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
          <span className="text-[10px] text-[#A8A29E]">Included with Eatinout</span>
        </div>
      </div>
    </Card>
  )
})

RestaurantListingCard.displayName = 'RestaurantListingCard'
