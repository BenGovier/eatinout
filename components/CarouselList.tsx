"use client"

import { useQuery } from "@tanstack/react-query"
import { memo } from "react"
import { CategorySection } from "./CategorySection"
import { UnsubscribedRestaurantCard } from "./unsubscribed-restaurant-card"

interface Offer {
  id: string
  title: string
  totalCodes?: number
  codesRedeemed?: number
}

interface Restaurant {
  _id: string
  name: string
  images: string[]
  area: string | string[]
  category?: Array<{ name: string }>
  offers: Offer[]
}

interface Carousel {
  _id: string
  name: string
  isGlobal: boolean
  restaurants: Restaurant[]
  order: number
}

interface CarouselListProps {
  areaId?: string
  getAreaNames: (area: string | string[], areas: any[]) => string
  areas: any[]
  onUnlockClick: (restaurant: any) => void
  searchTerm?: string
  selectedCuisineIds?: string[]
  selectedDining?: string[]
  selectedDayValues?: string[]
  selectedMealTimes?: string[]
}

export const CarouselList = memo(function CarouselList({ 
  areaId, 
  getAreaNames, 
  areas, 
  onUnlockClick,
  searchTerm,
  selectedCuisineIds,
  selectedDining,
  selectedDayValues,
  selectedMealTimes
}: CarouselListProps) {
  const normalizedSearch = searchTerm?.trim() || ""
  const cuisineIds = (selectedCuisineIds || []).filter(Boolean)
  const dining = selectedDining || []
  const dayValues = (selectedDayValues || []).filter(Boolean)
  const mealTimes = (selectedMealTimes || []).filter(Boolean)

  const { data, isLoading } = useQuery({
    queryKey: [
      "carousels",
      areaId || "all",
      normalizedSearch,
      cuisineIds.join(","),
      dining.join(","),
      dayValues.join(","),
      mealTimes.join(",")
    ],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (areaId) params.append("areaId", areaId)
      if (normalizedSearch) params.append("search", normalizedSearch)
      if (cuisineIds.length > 0) params.append("categoryId", cuisineIds.join(","))
      if (dining.includes("dine-in")) params.append("dineIn", "true")
      if (dining.includes("takeaway")) params.append("dineOut", "true")
      if (dayValues.length > 0) params.append("days", dayValues.join(","))
      if (mealTimes.length > 0) params.append("mealTimes", mealTimes.join(","))
      params.append("limit", "10")

      const response = await fetch(`/api/carousels?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch carousels")
      return response.json()
    },
    staleTime: 30000,
    gcTime: 300000,
  })

  if (isLoading) {
    return (
      <div className="py-5 space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-4">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="w-[240px] h-[280px] bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!data?.success || !data.carousels?.length) return null

  const sortedCarousels = [...data.carousels].sort((a, b) => {
    if (a.isGlobal && !b.isGlobal) return -1
    if (!a.isGlobal && b.isGlobal) return 1
    return a.order - b.order
  })

  return (
    <div className="py-5 space-y-5">
      {sortedCarousels.map((carousel) => {
        if (!carousel.restaurants?.length) return null

        return (
          <CategorySection key={carousel._id} title={carousel.name}>
            {carousel.restaurants.map((restaurant) => {
              const location = Array.isArray(restaurant.area)
                ? getAreaNames(restaurant.area, areas)
                : restaurant.area

              return (
                <UnsubscribedRestaurantCard
                  key={restaurant._id}
                  name={restaurant.name}
                  zipCode={restaurant.zipCode}
                  cuisine={restaurant.category?.[0]?.name || ""}
                  location={restaurant.city}
                  image={restaurant.images?.[0] || "/placeholder.svg"}
                  offersCount={restaurant.offers?.length || 0}
                  offers={restaurant.offers}
                  firstOffer={restaurant.offers?.[0]}
                  onClick={() => onUnlockClick({
                    id: restaurant._id,
                    name: restaurant.name,
                    imageUrl: restaurant.images?.[0],
                    offers: restaurant.offers,
                    area: restaurant.area,
                    category: restaurant.category,
                    dealsCount: restaurant.offers?.length || 0
                  })}
                />
              )
            })}
          </CategorySection>
        )
      })}
    </div>
  )
})