"use client"

import {
  Search,
  MapPin,
  SlidersHorizontal,
  Store,
  PiggyBank,
  X,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useScrollPreservation } from "@/hooks/use-scroll-preservation"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import Link from "next/link"
import { FlavourSection } from "@/components/FlavourSection"
import { UnsubscribedAllRestaurantsCard } from "@/components/unsubscribed-all-restaurants-card"
import { CarouselList } from "@/components/CarouselList"
import { RestaurantCardSkeleton } from "@/components/restaurant-card-skeleton"

type Category = {
  id: string
  name: string
}

type OfferData = {
  id: string
  title: string
  tags: string[]
  startDate?: string
  expiryDate?: string
  status: string
  totalCodes: number
  codesRedeemed: number
  expiresAt?: string
}

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
  offers: OfferData[]
  imageUrl: string
  dineIn: boolean
  dineOut: boolean
  priceRange: string
  openingHours: string
  category: Category[]
  deliveryAvailable: boolean
}

type AreaOption = {
  value: string
  label: string
}

type CuisineOption = {
  value: string
  label: string
}

const DAYS_AVAILABLE = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" }
] as const

const MEAL_TIMES = ["Morning 7am-12pm", "Afternoon 12pm-5pm", "Evening 5pm-late!"] as const

const DAY_MAP: Record<string, string> = {
  'monday': 'Mon',
  'tuesday': 'Tue',
  'wednesday': 'Wed',
  'thursday': 'Thu',
  'friday': 'Fri',
  'saturday': 'Sat',
  'sunday': 'Sun'
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

interface PageState {
  restaurants: Restaurant[]
  loading: boolean
  error: string | null
  isRestoringScroll: boolean
  pagination: {
    currentPage: number
    totalPages: number
    hasNextPage: boolean
  }
}

interface FilterState {
  searchTerm: string
  locationSearch: string
  selectedLocation: string
  selectedLocationId: string
  selectedCuisines: string[]
  selectedCuisineIds: string[]
  selectedDays: string[]
  selectedDayValues: string[]
  selectedDining: string[]
  selectedMealTimes: string[]
}

interface UIState {
  showLocationDropdown: boolean
  showFilters: boolean
  showMobileMenu: boolean
  showAllCuisines: boolean
  unlockModalRestaurant: Restaurant | null
}

interface MetaState {
  areas: AreaOption[]
  areasLoading: boolean
  areasError: string | null
  cuisineTypes: CuisineOption[]
  cuisineTypesLoading: boolean
  cuisineTypesError: string | null
}

export default function RestaurantListingPage() {
  const { saveScrollPosition, getSavedPageState, clearScrollPosition } = useScrollPreservation()
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const locationDropdownRef = useRef<HTMLDivElement>(null)

  const [pageState, setPageState] = useState<PageState>({
    restaurants: [],
    loading: true,
    error: null,
    isRestoringScroll: false,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      hasNextPage: false
    }
  })

  const [filterState, setFilterState] = useState<FilterState>({
    searchTerm: "",
    locationSearch: "",
    selectedLocation: "",
    selectedLocationId: "",
    selectedCuisines: [],
    selectedCuisineIds: [],
    selectedDays: [],
    selectedDayValues: [],
    selectedDining: [],
    selectedMealTimes: []
  })

  const [uiState, setUIState] = useState<UIState>({
    showLocationDropdown: false,
    showFilters: false,
    showMobileMenu: false,
    showAllCuisines: false,
    unlockModalRestaurant: null
  })

  const [metaState, setMetaState] = useState<MetaState>({
    areas: [],
    areasLoading: true,
    areasError: null,
    cuisineTypes: [],
    cuisineTypesLoading: true,
    cuisineTypesError: null,
  })

  const [carouselVisibility, setCarouselVisibility] = useState<Record<string, boolean>>({
    'todays-deals': false,
    'available-everywhere': true,
  })

  const [showBottomBanner, setShowBottomBanner] = useState(true)

  const debouncedSearchTerm = useDebounce(filterState.searchTerm, 500)
  const filtersRef = useRef({
    selectedLocationId: "",
    searchTerm: "",
    selectedCuisineIds: [] as string[],
    selectedDining: [] as string[],
    selectedDayValues: [] as string[],
    selectedMealTimes: [] as string[]
  })
  const fetchingRef = useRef<Set<string>>(new Set())
  const skipFilterEffectRef = useRef(false)

  const navigateToRestaurant = useCallback((
    restaurantId: string,
    offerId?: string
  ) => {
    saveScrollPosition({
      currentPage: pageState.pagination.currentPage,
      totalItems: pageState.restaurants.length
    })

    let url = user?.role === "user" && user.subscriptionStatus !== "active"
      ? `/view-restaurant/${restaurantId}`
      : `/restaurant/${restaurantId}`

    if (offerId) {
      url += `?offerId=${offerId}`
    }

    if (!isAuthenticated) {
      url = `/view-restaurant/${restaurantId}`
      if (offerId) url += `?offerId=${offerId}`
    }

    router.push(url)
  }, [saveScrollPosition, pageState.pagination.currentPage, pageState.restaurants.length, user?.role, user?.subscriptionStatus, isAuthenticated, router])

  const fetchRestaurants = useCallback(async (page = 1, reset = true) => {
    const filters = filtersRef.current
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '12'
    })

    if (filters.selectedLocationId && filters.selectedLocationId !== 'all') {
      params.append('area', filters.selectedLocationId)
    }
    if (filters.searchTerm?.trim()) {
      params.append('search', filters.searchTerm.trim())
    }
    if (filters.selectedCuisineIds.length > 0) {
      params.append('categoryId', filters.selectedCuisineIds.join(','))
    }
    if (filters.selectedDining.includes('dine-in')) {
      params.append('dineIn', 'true')
    }
    if (filters.selectedDining.includes('takeaway')) {
      params.append('dineOut', 'true')
    }
    if (filters.selectedDayValues.length > 0) {
      params.append('days', filters.selectedDayValues.join(','))
    }
    if (filters.selectedMealTimes.length > 0) {
      params.append('mealTimes', filters.selectedMealTimes.join(','))
    }

    const requestKey = `${params.toString()}-${page}`

    if (fetchingRef.current.has(requestKey)) {
      return
    }

    try {
      fetchingRef.current.add(requestKey)

      if (reset) {
        setPageState(prev => ({ ...prev, loading: true, error: null }))
      }

      const response = await fetch(`/api/restaurants/all?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Server error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success || !Array.isArray(data.restaurants)) {
        throw new Error(data.message || "Invalid response format")
      }

      setPageState(prev => ({
        ...prev,
        restaurants: reset ? data.restaurants : [...prev.restaurants, ...data.restaurants],
        loading: false,
        pagination: {
          currentPage: data.pagination?.currentPage || page,
          totalPages: data.pagination?.totalPages || 1,
          hasNextPage: data.pagination?.hasNextPage || false
        }
      }))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setPageState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
        restaurants: reset ? [] : prev.restaurants
      }))
    } finally {
      fetchingRef.current.delete(requestKey)
    }
  }, [])

  useEffect(() => {
    filtersRef.current = {
      selectedLocationId: filterState.selectedLocationId,
      searchTerm: debouncedSearchTerm,
      selectedCuisineIds: filterState.selectedCuisineIds,
      selectedDining: filterState.selectedDining,
      selectedDayValues: filterState.selectedDayValues,
      selectedMealTimes: filterState.selectedMealTimes
    }
  }, [filterState.selectedLocationId, debouncedSearchTerm, filterState.selectedCuisineIds, filterState.selectedDining, filterState.selectedDayValues, filterState.selectedMealTimes])

  useEffect(() => {
    let isMounted = true

    const initializePage = async () => {
      const savedPageState = getSavedPageState()

      if (savedPageState && savedPageState.currentPage > 1) {
        if (!isMounted) return
        setPageState(prev => ({ ...prev, isRestoringScroll: true }))

        const pagesToLoad = Array.from({ length: savedPageState.currentPage }, (_, i) => i + 1)
        const batchSize = 3

        for (let i = 0; i < pagesToLoad.length; i += batchSize) {
          if (!isMounted) break
          const batch = pagesToLoad.slice(i, i + batchSize)
          await Promise.all(batch.map(page => fetchRestaurants(page, page === 1)))
        }

        if (isMounted) {
          setPageState(prev => ({ ...prev, isRestoringScroll: false }))
        }
      } else {
        if (isMounted) {
          fetchRestaurants(1, true)
        }
      }
    }

    initializePage()

    return () => {
      isMounted = false
    }
  }, [fetchRestaurants, getSavedPageState])

  useEffect(() => {
    if (pageState.isRestoringScroll) {
      skipFilterEffectRef.current = true
      return
    }

    if (skipFilterEffectRef.current) {
      skipFilterEffectRef.current = false
      return
    }

    fetchRestaurants(1, true)
  }, [
    debouncedSearchTerm,
    filterState.selectedLocationId,
    filterState.selectedCuisineIds,
    filterState.selectedDining,
    filterState.selectedDayValues,
    filterState.selectedMealTimes,
    fetchRestaurants,
    pageState.isRestoringScroll
  ])

  const loadMoreRestaurants = useCallback(() => {
    if (pageState.pagination.hasNextPage && !pageState.loading) {
      fetchRestaurants(pageState.pagination.currentPage + 1, false)
    }
  }, [pageState.pagination.hasNextPage, pageState.pagination.currentPage, pageState.loading, fetchRestaurants])

  useEffect(() => {
    const handleScroll = () => {
      if (pageState.loading || !pageState.pagination.hasNextPage) return

      const scrollTop = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      if (scrollTop + windowHeight >= documentHeight - 500) {
        loadMoreRestaurants()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pageState.loading, pageState.pagination.hasNextPage, loadMoreRestaurants])

  const clearFilterState = useCallback(() => {
    sessionStorage.removeItem('restaurantFilters')
  }, [])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterState(prev => ({ ...prev, searchTerm: e.target.value }))
    clearScrollPosition()
    clearFilterState()
  }, [clearScrollPosition, clearFilterState])

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [areasResponse, cuisinesResponse] = await Promise.all([
          fetch("/api/areas", { next: { revalidate: 300 } }),
          fetch("/api/admin/categories?dropdown=true", { next: { revalidate: 300 } }),
          // fetch("/api/categories", { next: { revalidate: 60 } })
        ])
        if (areasResponse.ok) {
          const areasData = await areasResponse.json()
          if (areasData.success && areasData.areas) {
            const transformedAreas = areasData.areas
              .filter((area: any) => !area.hideRestaurant)
              .map((area: any) => ({
                value: area._id,
                label: area.name,
              }))

            setMetaState(prev => ({
              ...prev,
              areas: transformedAreas,
              areasLoading: false
            }))
          } else {
            throw new Error(areasData.message || "Failed to fetch areas")
          }
        } else {
          setMetaState(prev => ({
            ...prev,
            areasError: "Failed to fetch areas",
            areasLoading: false
          }))
        }

        if (cuisinesResponse.ok) {
          const cuisinesData = await cuisinesResponse.json()
          if (cuisinesData.success && Array.isArray(cuisinesData.categories)) {
            const transformedCategories = cuisinesData.categories
              .filter((cat: { isActive: boolean }) => cat.isActive)
              .map((category: { _id: string; name: string; image?: string }) => ({
                value: category._id,
                label: category.name,
                image: category.image || undefined,
              }))
            // .sort((a: { label: string }, b: { label: string }) =>
            //   a.label.localeCompare(b.label)
            // )

            setMetaState(prev => ({
              ...prev,
              cuisineTypes: transformedCategories,
              cuisineTypesLoading: false
            }))
          } else {
            throw new Error(cuisinesData.message || "Failed to fetch cuisines")
          }
        } else {
          setMetaState(prev => ({
            ...prev,
            cuisineTypesError: "Failed to fetch cuisines",
            cuisineTypesLoading: false
          }))
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        setMetaState(prev => ({
          ...prev,
          areasError: errorMessage,
          cuisineTypesError: errorMessage,
          // categoriesError: errorMessage,
          areasLoading: false,
          cuisineTypesLoading: false,
          // categoriesLoading: false
        }))
      }
    }

    fetchMetadata()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setUIState(prev => ({ ...prev, showLocationDropdown: false }))
      }
    }

    if (uiState.showLocationDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [uiState.showLocationDropdown])

  const filteredLocations = useMemo(() => {
    if (!filterState.locationSearch) return metaState.areas
    const searchLower = filterState.locationSearch.toLowerCase()
    return metaState.areas.filter((area) =>
      area.label.toLowerCase().includes(searchLower)
    )
  }, [metaState.areas, filterState.locationSearch])

const toggleCuisine = useCallback((cuisineId: string, cuisineLabel: string) => {
  const isAdding = !filterState.selectedCuisineIds.includes(cuisineId)
  setFilterState(prev => ({
    ...prev,
    selectedCuisineIds: isAdding
      ? [...prev.selectedCuisineIds, cuisineId]
      : prev.selectedCuisineIds.filter(id => id !== cuisineId),
    selectedCuisines: isAdding
      ? [...prev.selectedCuisines, cuisineLabel]
      : prev.selectedCuisines.filter(label => label !== cuisineLabel),
  }))
}, [filterState.selectedCuisineIds, filterState.selectedCuisines])

  const toggleDay = useCallback((dayValue: string, dayLabel: string) => {
    setFilterState(prev => ({
      ...prev,
      selectedDayValues: prev.selectedDayValues.includes(dayValue)
        ? prev.selectedDayValues.filter(v => v !== dayValue)
        : [...prev.selectedDayValues, dayValue],
      selectedDays: prev.selectedDays.includes(dayLabel)
        ? prev.selectedDays.filter(l => l !== dayLabel)
        : [...prev.selectedDays, dayLabel]
    }))
  }, [])

  const toggleDining = useCallback((option: string) => {
    setFilterState(prev => ({
      ...prev,
      selectedDining: prev.selectedDining.includes(option)
        ? prev.selectedDining.filter(o => o !== option)
        : [...prev.selectedDining, option]
    }))
  }, [])

  const toggleMealTime = useCallback((mealTime: string) => {
    setFilterState(prev => ({
      ...prev,
      selectedMealTimes: prev.selectedMealTimes.includes(mealTime)
        ? prev.selectedMealTimes.filter(m => m !== mealTime)
        : [...prev.selectedMealTimes, mealTime]
    }))
  }, [])

  const getAreaNames = useCallback((areaData: string | string[], areasList: AreaOption[]) => {
    const areaIds = Array.isArray(areaData) ? areaData : [areaData]
    const names = areaIds
      .map(areaId => {
        const area = areasList.find(a => a.value === areaId)
        return area ? area.label : null
      })
      .filter(Boolean)
    return names.length > 0 ? names.join(", ") : "Location not available"
  }, [])

  const handleUnlockClick = useCallback((restaurant: Restaurant) => {
    setUIState(prev => ({ ...prev, unlockModalRestaurant: restaurant }))
  }, [])

  useEffect(() => {
    if (filterState.selectedLocation && metaState.areas.length > 0) {
      const match = metaState.areas.find(a => a.label === filterState.selectedLocation)
      if (match) {
        setFilterState(prev => ({
          ...prev,
          selectedLocationId: match.value,
        }))
      }
    }
  }, [filterState.selectedLocation, metaState.areas])

  const hasFilters = useMemo(() => {
    return !!(
      filterState.selectedLocationId ||
      filterState.selectedCuisineIds.length > 0 ||
      filterState.selectedDining.length > 0 ||
      filterState.selectedDayValues.length > 0 ||
      filterState.selectedMealTimes.length > 0 ||
      debouncedSearchTerm
    )
  }, [
    filterState.selectedLocationId,
    filterState.selectedCuisineIds.length,
    filterState.selectedDining.length,
    filterState.selectedDayValues.length,
    filterState.selectedMealTimes.length,
    debouncedSearchTerm
  ])

  // const otherCategoriesHaveData = useMemo(() => {
  //   return Object.keys(carouselVisibility).some(key =>
  //     key !== 'todays-deals' &&
  //     key !== 'available-everywhere' &&
  //     carouselVisibility[key] === true
  //   )
  // }, [carouselVisibility])

  const selectedArea = useMemo(() => {
    return metaState.areas.find(area => area.value === filterState.selectedLocationId)
  }, [metaState.areas, filterState.selectedLocationId])


  // Add this computed value for the dynamic title
  const sectionTitle = useMemo(() => {
    const locationPart = selectedArea?.label || ''
    const categoriesPart = filterState.selectedCuisines.length > 0
      ? filterState.selectedCuisines.join(', ')
      : 'All Restaurants'

    if (locationPart && filterState.selectedCuisines.length > 0) {
      return `${locationPart} · ${categoriesPart}`
    } else if (locationPart) {
      return `${locationPart} · All Restaurants`
    } else if (filterState.selectedCuisines.length > 0) {
      return categoriesPart
    }

    return 'All Restaurants'
  }, [selectedArea, filterState.selectedCuisines])

  // Add logic to determine if carousels should be shown
  const shouldShowCarousels = useMemo(() => {
    // Hide carousels if there's an active search
    if (debouncedSearchTerm.trim()) {
      return false
    }

    // Hide carousels if any categories are selected
    if (filterState.selectedCuisineIds.length > 0) {
      return false
    }

    return true
  }, [debouncedSearchTerm, filterState.selectedCuisineIds])
  useEffect(() => {
    if (!filterState.selectedLocationId) return
    clearScrollPosition()
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    })
    setPageState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        currentPage: 1
      }
    }))
    fetchRestaurants(1, true)
  }, [filterState.selectedLocationId])
  return (
    <>
      <main className="min-h-screen bg-[#FFFBF7] pb-20">
        <section className="sticky top-16 z-30 bg-white border-b border-gray-100 py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#DC3545] w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search restaurant/food type"
                    value={filterState.searchTerm}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-4 py-6 text-base border-gray-200 rounded-xl focus:ring-2 focus:ring-[#DC3545] focus:border-transparent"
                  />
                  {filterState.searchTerm && (
                    <button
                      onClick={() => {
                        setFilterState(prev => ({ ...prev, searchTerm: "" }))
                        clearFilterState()
                      }}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setUIState(prev => ({ ...prev, showFilters: !prev.showFilters }))}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-gray-200 hover:border-[#DC3545] transition-colors"
                >
                  <SlidersHorizontal className="w-5 h-5 text-[#DC3545]" />
                  <span className="text-[#DC3545] font-medium">Filters</span>
                </Button>
              </div>

              <div className="flex items-center justify-start text-sm w-full">
                <div className="relative w-full" ref={locationDropdownRef}>
                  <button
                    className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
                    onClick={() => setUIState(prev => ({ ...prev, showLocationDropdown: !prev.showLocationDropdown }))}
                  >
                    <MapPin className="w-4 h-4" />
                    <span>{filterState.selectedLocation || "Choose location"}</span>
                    {filterState.selectedLocation && (
                      <>
                        <span className="text-gray-400">·</span>
                        <span className="text-[#DC3545]">change</span>
                      </>
                    )}
                  </button>

                  {uiState.showLocationDropdown && !metaState.areasLoading && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20 w-full">
                      {/* ✅ ALL LOCATIONS OPTION - Always at top */}
                      {/* <button
                        onClick={() => {
                          setFilterState(prev => ({
                            ...prev,
                            selectedLocation: "",
                            selectedLocationId: "",
                            locationSearch: ""
                          }))
                          setUIState(prev => ({ ...prev, showLocationDropdown: false }))
                        }}
                        className={`w-full text-left px-3 py-2.5 transition-colors border-b border-gray-200 text-sm font-semibold ${!filterState.selectedLocation
                            ? 'bg-[#DC3545]/5 text-[#DC3545]'
                            : 'hover:bg-gray-50 text-gray-700'
                          }`}
                      > */}
                        <button
                          onClick={() => {
                            setFilterState(prev => ({
                              ...prev,
                              selectedLocation: "",
                              selectedLocationId: "all",
                            }))
                            clearScrollPosition()
                            window.scrollTo({
                              top: 0,
                              behavior: "smooth"
                            })
                            setPageState(prev => ({
                              ...prev,
                              pagination: {
                                ...prev.pagination,
                                currentPage: 1
                              }
                            }))
                            setUIState(prev => ({ ...prev, showLocationDropdown: false }))
                            fetchRestaurants(1, true)
                          }}
                          className={`w-full text-left px-3 py-2.5 transition-colors border-b border-gray-200 text-sm font-semibold ${!filterState.selectedLocation
                            ? 'bg-[#DC3545]/5 text-[#DC3545]'
                            : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                        <div className="flex items-center gap-2">
                          <MapPin className={`h-3.5 w-3.5 ${!filterState.selectedLocation ? 'text-[#DC3545]' : 'text-gray-400'}`} />
                          <span>All Locations</span>
                        </div>
                      </button>

                      {/* Individual Locations */}
                      {filteredLocations.length > 0 ? (
                        filteredLocations.map((area) => (
                          <button
                            key={area.value}
                            onClick={() => {
                              setFilterState(prev => ({
                                ...prev,
                                selectedLocation: area.label,
                                selectedLocationId: area.value,
                                locationSearch: ""
                              }))
                              setUIState(prev => ({ ...prev, showLocationDropdown: false }))
                            }}
                            className={`w-full text-left px-3 py-2.5 transition-colors border-b border-gray-100 last:border-b-0 text-sm ${filterState.selectedLocationId === area.value
                                ? 'bg-[#DC3545]/5 font-semibold'
                                : 'hover:bg-gray-50'
                              }`}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-gray-400" />
                              <span className="font-medium">{area.label}</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2.5 text-sm text-gray-500 text-center">
                          No locations found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>



        {uiState.showFilters && (
          <div className="bg-white border-b border-gray-100 px-4 pb-6 space-y-4 md:space-y-6">
            {filterState.selectedLocation && (
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {filterState.selectedLocation}
                </Badge>
                <button
                  onClick={() => {
                    setFilterState(prev => ({
                      ...prev,
                      selectedLocation: "",
                      selectedLocationId: ""
                    }))
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            )}

            {(filterState.selectedMealTimes.length > 0 || filterState.selectedCuisines.length > 0 || filterState.selectedDays.length > 0 || filterState.selectedDining.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {filterState.selectedMealTimes.map((mealTime) => (
                  <Badge key={mealTime} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {mealTime}
                  </Badge>
                ))}
                {filterState.selectedCuisines.map((cuisine) => (
                  <Badge key={cuisine} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {cuisine}
                  </Badge>
                ))}
                {filterState.selectedDays.map((day) => (
                  <Badge key={day} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {day}
                  </Badge>
                ))}
                {filterState.selectedDining.map((dining) => (
                  <Badge key={dining} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {dining === "dine-in" ? "Dine In" : "Takeaway"}
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-4 pt-4 md:pt-5 pb-4">
              <div>
                <label className="text-sm font-semibold mb-2 block text-foreground">Days Available</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_AVAILABLE.map((day) => (
                    <Button
                      key={day.value}
                      variant={filterState.selectedDayValues.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDay(day.value, day.label)}
                      className={filterState.selectedDayValues.includes(day.value) ? "bg-primary hover:bg-primary/90 text-white rounded-2xl" : "rounded-2xl"}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block text-foreground">Dine In or Out</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={filterState.selectedDining.includes("dine-in") ? "default" : "outline"}
                    onClick={() => toggleDining("dine-in")}
                    className={filterState.selectedDining.includes("dine-in") ? "bg-primary hover:bg-primary/90 text-white rounded-2xl" : "rounded-2xl"}
                  >
                    Dine In
                  </Button>
                  <Button
                    variant={filterState.selectedDining.includes("takeaway") ? "default" : "outline"}
                    onClick={() => toggleDining("takeaway")}
                    className={filterState.selectedDining.includes("takeaway") ? "bg-primary hover:bg-primary/90 text-white rounded-2xl" : "rounded-2xl "}
                  >
                    Takeaway
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block text-foreground">Meal Time</label>
                <div className="flex flex-col gap-2">
                  {MEAL_TIMES.map((mealTime) => (
                    <Button
                      key={mealTime}
                      variant={filterState.selectedMealTimes.includes(mealTime) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleMealTime(mealTime)}
                      className={filterState.selectedMealTimes.includes(mealTime) ? "bg-primary hover:bg-primary/90 text-white rounded-2xl" : "rounded-2xl"}
                    >
                      {mealTime}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    setUIState(prev => ({ ...prev, showFilters: false }))
                    clearScrollPosition()
                  }}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-2xl"
                >
                  Apply Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterState({
                      searchTerm: "",
                      locationSearch: "",
                      selectedLocation: "",
                      selectedLocationId: "",
                      selectedCuisines: [],
                      selectedCuisineIds: [],
                      selectedDays: [],
                      selectedDayValues: [],
                      selectedDining: [],
                      selectedMealTimes: []
                    })
                    clearScrollPosition()
                    clearFilterState()
                  }}
                  className="flex-1 rounded-2xl"
                >
                  Reset
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setUIState(prev => ({ ...prev, showFilters: false }))}
                  className="flex-shrink-0"
                >
                  ✕
                </Button>
              </div>
            </div>
          </div>
        )}
        <FlavourSection
          cuisineTypes={metaState.cuisineTypes}
          selectedCuisineIds={filterState.selectedCuisineIds}
          onCuisineClick={toggleCuisine}
          isLoading={metaState.cuisineTypesLoading}
        />
        {shouldShowCarousels && (
          <CarouselList
            areaId={filterState.selectedLocationId || undefined}
            getAreaNames={getAreaNames}
            areas={metaState.areas}
            onUnlockClick={handleUnlockClick}
            searchTerm={debouncedSearchTerm}
            selectedCuisineIds={filterState.selectedCuisineIds}
            selectedDining={filterState.selectedDining}
            selectedDayValues={filterState.selectedDayValues}
            selectedMealTimes={filterState.selectedMealTimes}
          />
        )}

        <section className="px-4 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{sectionTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pageState.restaurants.map((restaurant) => {
              const location = Array.isArray(restaurant.area)
                ? getAreaNames(restaurant.area, metaState.areas)
                : restaurant.location
              return (
                <UnsubscribedAllRestaurantsCard
                  key={restaurant.id}
                  name={restaurant.name}
                  zipCode={restaurant.zipCode || ""}
                  cuisine={restaurant.category?.[0]?.name || restaurant.cuisine || ""}
                  location={restaurant.city || ""}
                  image={restaurant.imageUrl}
                  offersCount={restaurant.dealsCount}
                  offers={restaurant.offers}
                  firstOffer={restaurant.offers?.[0]}
                  onClick={() => handleUnlockClick(restaurant)}
                />
              )
            })}
            {!pageState.loading && hasFilters && pageState.restaurants.length === 0 && (
              <div className="col-span-full">
                <div className="rounded-2xl border border-dashed border-[#DC3545]/30 bg-white p-6 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#DC3545]/10 text-[#DC3545]">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">No matches found</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Try changing your search or clearing a filter.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilterState({
                          searchTerm: "",
                          locationSearch: "",
                          selectedLocation: "",
                          selectedLocationId: "",
                          selectedCuisines: [],
                          selectedCuisineIds: [],
                          selectedDays: [],
                          selectedDayValues: [],
                          selectedDining: [],
                          selectedMealTimes: []
                        })
                        clearScrollPosition()
                        clearFilterState()
                      }}
                      className="rounded-full"
                    >
                      Clear filters
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {pageState.loading && pageState.restaurants.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {[1, 2, 3].map((i) => (
                <RestaurantCardSkeleton key={i} />
              ))}
            </div>
          )}
        </section>

        {showBottomBanner && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-primary to-primary/90 shadow-2xl border-t-4 border-primary/20 animate-fade-in">
            <div className="px-3 py-2 md:px-4 md:py-3 flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3 max-w-7xl mx-auto relative">
              <button
                onClick={() => setShowBottomBanner(false)}
                className="absolute top-2 right-2 lg:right-[-20px] z-50 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-1.5 md:p-2 transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl border border-white/30 hover:border-white/50"
                aria-label="Close banner"
              >
                <X className="h-3.5 w-3.5 md:h-4 md:w-4 lg:h-5 lg:w-5 text-white font-bold stroke-[3] transition-transform duration-200" />
              </button>
              <div className="flex-1">
                <p className="text-white font-bold text-xs md:text-sm lg:text-base leading-tight">Unlock 1,000s of Offers</p>
                <p className="text-white/90 text-[10px] md:text-xs">Save up to 50% at 400+ restaurants</p>
              </div>
              <button className="flex-shrink-0 bg-white mr-2 text-primary hover:bg-white/90 font-bold shadow-lg px-4 py-2 md:py-1.5 rounded text-[10px] md:text-xs lg:text-sm whitespace-nowrap">
                <Link href="/sign-up" className="block">
                  Start Free Trial
                </Link>
              </button>
            </div>
          </div>
        )}

        {uiState.unlockModalRestaurant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-6 w-6 text-primary" />
                    <h3 className="text-2xl font-bold text-foreground">
                      Unlock {uiState.unlockModalRestaurant.offers?.[0]?.title || "Exclusive Offers"}
                    </h3>
                  </div>
                  <p className="text-base text-foreground font-medium">at {uiState.unlockModalRestaurant.name}</p>
                </div>
                <button
                  onClick={() => setUIState(prev => ({ ...prev, unlockModalRestaurant: null }))}
                  className="p-2 hover:bg-accent rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-4">
                <p className="text-center text-foreground font-semibold mb-2">
                  Get this deal and 1,000s more with your 7-day FREE trial
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Store className="h-4 w-4" />
                  <span>400+ restaurants</span>
                  <span>•</span>
                  <PiggyBank className="h-4 w-4" />
                  <span>Save up to 50%</span>
                </div>
              </div>

              <Link href="/sign-up" className="block">
                <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 md:py-6">
                  <div className="flex items-center gap-1">
                    <span className="text-sm md:text-base lg:text-lg font-bold">Start free trial → </span>
                    <span className="text-xs md:text-sm font-normal opacity-90">(£4.99/month)</span>
                  </div>
                </Button>
              </Link>

              <p className="text-xs text-center text-muted-foreground">7 days free • Cancel anytime</p>
            </div>
          </div>
        )}

      </main>
    </>
  )
}