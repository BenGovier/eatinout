"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { RestaurantListingCard } from "@/components/RestaurantListingCard"
import { Card } from "@/components/ui/card"

type Restaurant = {
  id: string
  name: string
  cuisine?: string
  location: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  addressLink?: string
  area: string | string[]
  rating: number
  dealsCount: number
  offers: any[]
  imageUrl: string
  dineIn: boolean
  dineOut: boolean
  priceRange: string
  openingHours: string
  category: { id: string; name: string }[]
  deliveryAvailable: boolean
}

type AreaOption = {
  value: string
  label: string
}

interface TodaysDealsCarouselProps {
  selectedLocationId?: string
  areasList: AreaOption[]
  isAuthenticated: boolean
  onUnlockClick: (restaurant: Restaurant) => void
  onNavigate: (restaurantId: string, offerId?: string) => void
  mapDaysToDisplayFn: (tags: string[]) => string[]
  getDayLabelFn: (days: string[]) => string
  getAreaNamesFn: (areaData: string | string[], areasList: AreaOption[]) => string
  selectedCuisineIds?: string[]
  selectedDining?: string[]
  selectedDayValues?: string[]
  selectedMealTimes?: string[]
  searchTerm?: string
  onVisibilityChange?: (hasData: boolean) => void
}

const SkeletonCard = () => (
  <Card className="overflow-hidden relative p-0 animate-pulse flex-shrink-0 w-[310px]">
    <div className="w-full h-48 bg-muted" />
    <div className="p-3 space-y-2">
      <div className="h-5 bg-muted rounded w-2/3" />
      <div className="h-4 bg-muted rounded w-16" />
      <div className="h-14 bg-muted rounded-lg w-full" />
    </div>
  </Card>
)

export function TodaysDealsCarousel({
  selectedLocationId,
  areasList,
  isAuthenticated,
  onUnlockClick,
  onNavigate,
  mapDaysToDisplayFn,
  getDayLabelFn,
  getAreaNamesFn,
  selectedCuisineIds = [],
  selectedDining = [],
  selectedDayValues = [],
  selectedMealTimes = [],
  searchTerm = "",
  onVisibilityChange,
}: TodaysDealsCarouselProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  // Memoize array joins to prevent unnecessary re-renders
  const selectedDiningStr = useMemo(() => selectedDining.join(','), [selectedDining])
  const selectedDayValuesStr = useMemo(() => selectedDayValues.join(','), [selectedDayValues])
  const selectedMealTimesStr = useMemo(() => selectedMealTimes.join(','), [selectedMealTimes])

  const fetchRestaurants = useCallback(async (page: number, reset: boolean = false) => {
    if (loadingRef.current) return
    loadingRef.current = true

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        // No categoryId - we'll filter for restaurants with offers ending today
      })

      // Don't apply area filter for Today's Deals - show all
      // But apply other filters
      if (selectedDining.includes('dine-in')) {
        params.append('dineIn', 'true')
      }

      if (selectedDining.includes('takeaway')) {
        params.append('dineOut', 'true')
      }

      if (selectedDayValues.length > 0) {
        params.append('days', selectedDayValues.join(','))
      }

      if (selectedMealTimes.length > 0) {
        params.append('mealTimes', selectedMealTimes.join(','))
      }

      if (searchTerm?.trim()) {
        params.append('search', searchTerm.trim())
      }

      params.append('browsePinSort', '1')

      const response = await fetch(`/api/restaurants/all?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch restaurants')

      const data = await response.json()
      if (!data.success || !Array.isArray(data.restaurants)) {
        throw new Error('Invalid response format')
      }

      // Filter restaurants that have offers ending today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todaysDealsRestaurants = data.restaurants.filter((r: Restaurant) => {
        if (!r.offers || r.offers.length === 0) return false
        return r.offers.some((offer: any) => {
          if (!offer.expiryDate) return false
          const expiryDate = new Date(offer.expiryDate)
          expiryDate.setHours(0, 0, 0, 0)
          return expiryDate.getTime() === today.getTime()
        })
      })

      setRestaurants(prev => reset ? todaysDealsRestaurants : [...prev, ...todaysDealsRestaurants])
      setHasMore(data.pagination?.hasNextPage || false)
      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching restaurants for Today\'s Deals:', error)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [
    selectedDiningStr,
    selectedDayValuesStr,
    selectedMealTimesStr,
    searchTerm,
  ])

  useEffect(() => {
    setLoading(true)
    setRestaurants([])
    setCurrentPage(1)
    setHasMore(true)
    fetchRestaurants(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDiningStr, selectedDayValuesStr, selectedMealTimesStr, searchTerm])

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || loading || !hasMore || loadingRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    const threshold = 200 // Load more when 200px from the end

    if (scrollLeft + clientWidth >= scrollWidth - threshold) {
      fetchRestaurants(currentPage + 1, false)
    }
  }, [currentPage, hasMore, loading, fetchRestaurants])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Notify parent when restaurants change - MUST be before any conditional returns
  // Use ref to avoid recreating callback
  const onVisibilityChangeRef = useRef(onVisibilityChange)
  useEffect(() => {
    onVisibilityChangeRef.current = onVisibilityChange
  }, [onVisibilityChange])

  useEffect(() => {
    if (onVisibilityChangeRef.current && !loading) {
      onVisibilityChangeRef.current(restaurants.length > 0)
    }
  }, [restaurants.length, loading])

  const handleSwipeClick = useCallback((e: React.MouseEvent) => {
    const button = e.currentTarget
    const container = scrollContainerRef.current
    if (container) {
      const scrollAmount = 298 // 290px (card width) + 8px (gap)
      container.scrollBy({ left: scrollAmount, behavior: "smooth" })
    }
  }, [])

  if (loading && restaurants.length === 0) {
    return (
      <div className="flex gap-4 overflow-x-auto pl-4 pr-8 pb-2 scrollbar-hide">
        {[...Array(3)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (restaurants.length === 0) {
    return null // Empty carousel is hidden
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex gap-4 overflow-x-auto pl-4 pr-8 pb-2 scrollbar-hide"
      style={{ scrollSnapType: "x mandatory" }}
    >
      {restaurants.map((restaurant) => (
        <div key={restaurant.id} className="flex-shrink-0 w-[290px] h-full" style={{ scrollSnapAlign: "start" }}>
          <RestaurantListingCard
            restaurant={restaurant}
            areasList={areasList}
            isAuthenticated={isAuthenticated}
            onUnlockClick={onUnlockClick}
            onNavigate={onNavigate}
            onSwipeClick={handleSwipeClick}
            mapDaysToDisplayFn={mapDaysToDisplayFn}
            getDayLabelFn={getDayLabelFn}
            getAreaNamesFn={getAreaNamesFn}
            showUnlock={true}
          />
        </div>
      ))}
      {hasMore && (
        <div className="flex-shrink-0 w-[290px] flex items-center justify-center">
          <SkeletonCard />
        </div>
      )}
    </div>
  )
}

