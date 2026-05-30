"use client"

import {
  Search,
  MapPin,
  SlidersHorizontal,
  X,
  Store,
  PiggyBank,
  Lock,
  Tag,
  Heart,
  Ticket,
  ArrowRight,
  BadgeCheck,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { useScrollPreservation } from "@/hooks/use-scroll-preservation"
import { RestaurantListingCard } from "@/components/RestaurantListingCard"
import { CategorySection } from "@/components/CategorySection"
import { CategoryCarousel } from "@/components/CategoryCarousel"
import { FlavourSection } from "@/components/FlavourSection"
import { AvailableEverywhereCarousel } from "@/components/AvailableEverywhereCarousel"
import { AuthCarouselList } from "@/components/AuthCarouselList"
import { RestaurantCardSkeleton } from "@/components/restaurant-card-skeleton"
import Link from "next/link"
import Image from "next/image"
import { toast } from "react-toastify"
import { useAuth } from "@/context/auth-context"
import { WelcomeLocationModal } from "@/components/welcome-location-modal"

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
  /** True while a page-1 / filter reset fetch is in flight (show list skeleton, hide stale cards). */
  loadingListReset: boolean
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

interface MetaState {
  areas: AreaOption[]
  areasLoading: boolean
  areasError: string | null
  cuisineTypes: CuisineOption[]
  cuisineTypesLoading: boolean
  cuisineTypesError: string | null
  // categories: Array<{
  //   _id: string
  //   id: string
  //   name: string
  //   restaurantCount: number
  //   offersCount: number
  //   isGlobal: boolean
  //   priority?: number
  // }>
  // categoriesLoading: boolean
  // categoriesError: string | null
}

interface UIState {
  showLocationDropdown: boolean
  showFilters: boolean
  showMobileMenu: boolean
  showAllCuisines: boolean
  unlockModalRestaurant: Restaurant | null
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

export default function RestaurantsPage() {
  const { saveScrollPosition, getSavedPageState, clearScrollPosition } = useScrollPreservation()
  const router = useRouter()
  const { user } = useAuth();
  
  // Sales panel dismissal state
  const [salesPanelDismissed, setSalesPanelDismissed] = useState(false)
  
  // Check if user is an active paying member
  const isActiveMember = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "cancelled_with_access"
  
  // Check localStorage for panel dismissal on mount
  useEffect(() => {
    const dismissed = localStorage.getItem('eatinout_sales_panel_dismissed')
    if (dismissed === 'true') {
      setSalesPanelDismissed(true)
    }
  }, [])
  
  // Handle dismissing the sales panel
  const handleDismissSalesPanel = () => {
    setSalesPanelDismissed(true)
    localStorage.setItem('eatinout_sales_panel_dismissed', 'true')
  }
  
  // Show sales panel only if: not an active member AND not dismissed
  const showSalesPanel = !isActiveMember && !salesPanelDismissed
  
  // UIState ke saath yeh state add karein
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [favoritesLoading, setFavoritesLoading] = useState<Set<string>>(new Set())

  // User ke favorites fetch karein
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;

      try {
        const res = await fetch('/api/favorites', {
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (data.success && data.restaurants) {
          const favIds: any = new Set(data.restaurants.map((r: any) => r._id || r.id));
          setFavorites(favIds);
        }
      } catch (err) {
        console.error('Failed to fetch favorites:', err);
      }
    };

    fetchFavorites();
  }, [user]);

  const handleHeartClick = useCallback(
    async (
      e: React.MouseEvent,
      restaurantId: string,
      restaurantName: string
    ) => {
      e.preventDefault();
      e.stopPropagation();

      if (!user) return;

      setFavorites((prev) => {
        const isLiked = prev.has(restaurantId);
        const newSet = new Set(prev);

        if (isLiked) {
          newSet.delete(restaurantId);
        } else {
          newSet.add(restaurantId);
        }

        return newSet;
      });

      try {
        await fetch("/api/favorites/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantId,
            userId: (user as any).id || (user as any)._id || (user as any).userId,
          }),
        });
      } catch (err) {
        console.error("Favorite toggle error:", err);
      }
    },
    [user]
  );

  const [pageState, setPageState] = useState<PageState>({
    restaurants: [],
    loading: true,
    loadingListReset: false,
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
    // categories: [],
    // categoriesLoading: true,
    // categoriesError: null
  })

  const [carouselVisibility, setCarouselVisibility] = useState<Record<string, boolean>>({
    'available-everywhere': true,
  })

  const [showWelcomeLocationModal, setShowWelcomeLocationModal] = useState(true)

  // const [loadedCategories, setLoadedCategories] = useState<Set<string>>(new Set())
  // const [clickedCategoryId, setClickedCategoryId] = useState<string | null>(null)

  const debouncedSearchTerm = useDebounce(filterState.searchTerm, 500)
  const locationDropdownRef = useRef<HTMLDivElement>(null)
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

  const saveFilterState = useCallback(() => {
    const filterData = {
      searchTerm: filterState.searchTerm,
      selectedLocation: filterState.selectedLocation,
      selectedLocationId: filterState.selectedLocationId,
      selectedCuisines: filterState.selectedCuisines,
      selectedCuisineIds: filterState.selectedCuisineIds,
      selectedDays: filterState.selectedDays,
      selectedDayValues: filterState.selectedDayValues,
      selectedDining: filterState.selectedDining,
      selectedMealTimes: filterState.selectedMealTimes,
      showFilters: uiState.showFilters
    }
    sessionStorage.setItem('restaurantFilters', JSON.stringify(filterData))
  }, [filterState, uiState.showFilters])

  const restoreFilterState = useCallback(() => {
    try {
      const savedFilters = sessionStorage.getItem('restaurantFilters')
      if (savedFilters) {
        const savedState = JSON.parse(savedFilters)
        const newState = {
          searchTerm: savedState.searchTerm || "",
          locationSearch: "",
          selectedLocation: savedState.selectedLocation || "",
          selectedLocationId: savedState.selectedLocationId || "",
          selectedCuisines: savedState.selectedCuisines || [],
          selectedCuisineIds: savedState.selectedCuisineIds || [],
          selectedDays: savedState.selectedDays || [],
          selectedDayValues: savedState.selectedDayValues || [],
          selectedDining: savedState.selectedDining || [],
          selectedMealTimes: savedState.selectedMealTimes || []
        }
        setFilterState(newState)
        setUIState(prev => ({ ...prev, showFilters: savedState.showFilters || false }))
        // Update ref immediately to avoid race conditions
        filtersRef.current = {
          selectedLocationId: newState.selectedLocationId,
          searchTerm: newState.searchTerm,
          selectedCuisineIds: newState.selectedCuisineIds,
          selectedDining: newState.selectedDining,
          selectedDayValues: newState.selectedDayValues,
          selectedMealTimes: newState.selectedMealTimes
        }
        return newState
      }
    } catch (error) {
      console.error('Failed to restore filter state:', error)
    }
    return null
  }, [])

  const clearFilterState = useCallback(() => {
    sessionStorage.removeItem('restaurantFilters')
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
    params.append('browsePinSort', '1')

    const requestKey = `${params.toString()}-${page}`

    if (fetchingRef.current.has(requestKey)) {
      return
    }

    try {
      fetchingRef.current.add(requestKey)

      if (reset) {
        setPageState(prev => ({
          ...prev,
          loading: true,
          loadingListReset: true,
          error: null,
        }))
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
        loadingListReset: false,
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
        loadingListReset: false,
        restaurants: reset ? [] : prev.restaurants
      }))
    } finally {
      fetchingRef.current.delete(requestKey)
    }
  }, [])

  // Removed separate call to restoreFilterState as it's now part of initializePage

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("restaurantFilters")
      if (!raw) return
      const s = JSON.parse(raw) as {
        selectedLocationId?: string
        selectedLocation?: string
      }
      if (s.selectedLocationId === "all") {
        setShowWelcomeLocationModal(false)
        return
      }
      if (s.selectedLocationId && s.selectedLocationId !== "") {
        setShowWelcomeLocationModal(false)
        return
      }
      if (s.selectedLocation && s.selectedLocation !== "") {
        setShowWelcomeLocationModal(false)
      }
    } catch {
      /* keep modal visible */
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const initializePage = async () => {
      // 1. Restore filters first
      const restoredFilters = restoreFilterState()

      // 2. Check scroll preservation
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
          // fetchRestaurants uses filtersRef.current which we updated in restoreFilterState
          fetchRestaurants(1, true)
        }
      }
    }

    initializePage()

    return () => {
      isMounted = false
    }
  }, []) // Run once on mount

  useEffect(() => {
    if (pageState.isRestoringScroll) {
      skipFilterEffectRef.current = true
      return
    }

    if (skipFilterEffectRef.current) {
      skipFilterEffectRef.current = false
      return
    }

    // Only fetch if we are NOT in the initial mount phase (where initializePage handles it)
    // Actually, we can just let this effect handle ALL filter changes including the first one if we don't call it in initializePage.
    // To keep it safe and avoid double fetching or missing the first fetch:
    if (filterState.selectedLocationId || filterState.selectedCuisineIds.length > 0) {
      saveFilterState()
      clearScrollPosition()
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      })
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
    saveFilterState,
    clearScrollPosition
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

        // if (categoriesResponse.ok) {
        //   const categoriesData = await categoriesResponse.json()
        //   if (categoriesData.success && Array.isArray(categoriesData.categories)) {
        //     const transformedCategories = categoriesData.categories
        //       .map((category: any) => {
        //         const restaurantAreas = new Set<string>()
        //         if (category.restaurants && Array.isArray(category.restaurants)) {
        //           category.restaurants.forEach((restaurant: any) => {
        //             const areas = Array.isArray(restaurant.area) ? restaurant.area : [restaurant.area]
        //             areas.forEach((areaId: any) => {
        //               if (areaId) restaurantAreas.add(areaId.toString())
        //             })
        //           })
        //         }
        //         const isGlobal = restaurantAreas.size >= 3 || category.restaurantCount >= 10

        //         return {
        //           _id: category._id,
        //           id: category._id.toString(),
        //           name: category.name,
        //           priority: category.priority ?? 999,
        //           restaurantCount: category.restaurantCount || 0,
        //           offersCount: category.offersCount || 0,
        //           isGlobal
        //         }
        //       })
        //       .filter((cat: any) => cat.offersCount > 0)
        //       .sort((a: any, b: any) => {
        //         const priorityA = a.priority ?? 999
        //         const priorityB = b.priority ?? 999
        //         if (priorityA !== priorityB) {
        //           return priorityA - priorityB
        //         }
        //         if (b.offersCount !== a.offersCount) {
        //           return b.offersCount - a.offersCount
        //         }
        //         return a.name.localeCompare(b.name)
        //       })

        //     setMetaState(prev => ({
        //       ...prev,
        //       categories: transformedCategories,
        //       categoriesLoading: false
        //     }))

        //     const initialCategories = transformedCategories.slice(0, 5).map((cat: any) => cat.id)
        //     setLoadedCategories(new Set(initialCategories))
        //   } else {
        //     throw new Error(categoriesData.message || "Failed to fetch categories")
        //   }
        // } else {
        //   setMetaState(prev => ({
        //     ...prev,
        //     categoriesError: "Failed to fetch categories",
        //     categoriesLoading: false
        //   }))
        // }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        setMetaState(prev => ({
          ...prev,
          areasError: errorMessage,
          cuisineTypesError: errorMessage,
          categoriesError: errorMessage,
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

    const newSelectedCuisineIds = isAdding
      ? [...filterState.selectedCuisineIds, cuisineId]
      : filterState.selectedCuisineIds.filter(id => id !== cuisineId)
    const newSelectedCuisines = isAdding
      ? [...filterState.selectedCuisines, cuisineLabel]
      : filterState.selectedCuisines.filter(label => label !== cuisineLabel)

    setFilterState(prev => ({
      ...prev,
      selectedCuisineIds: newSelectedCuisineIds,
      selectedCuisines: newSelectedCuisines
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

  const mapDaysToDisplay = useCallback((tags: string[]) => {
    return tags.map(tag => DAY_MAP[tag.toLowerCase()] || tag).filter(Boolean)
  }, [])

  const getDayLabel = useCallback((days: string[]) => {
    if (days.length === 7) return "All Week"
    if (days.length > 1) return "Multi Days"
    return days[0]
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

  const handleWelcomeLocationSelect = useCallback((locationName: string) => {
    if (locationName === "") {
      setFilterState((prev) => ({
        ...prev,
        selectedLocation: "",
        selectedLocationId: "all",
      }))
    } else {
      setFilterState((prev) => ({
        ...prev,
        selectedLocation: locationName,
      }))
    }
    setShowWelcomeLocationModal(false)
  }, [])

  useEffect(() => {
    if (filterState.selectedLocation && metaState.areas.length > 0) {
      const match = metaState.areas.find(
        (a) => a.label === filterState.selectedLocation,
      )
      if (match) {
        setFilterState((prev) => ({
          ...prev,
          selectedLocationId: match.value,
        }))
      }
    }
  }, [filterState.selectedLocation, metaState.areas])

  const handleRestaurantNavigate = useCallback(async (restaurantId: string, offerId?: string) => {
    // If user is not signed in, redirect to sign-up
    if (!user) {
      router.push("/sign-up")
      return
    }
    
    // Check if the user is a normal user without an active subscription
    if (user.role === "user" && (user.subscriptionStatus === "inactive" || user.subscriptionStatus === "cancelled")) {
      try {
        const response = await fetch("/api/payment/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        });
        const { url } = await response.json();
        if (response.ok && url) {
          sessionStorage.setItem('redirectUrl', `/restaurant/${restaurantId}`);
          window.location.replace(url);
        } else {
          toast.error("Failed to initiate checkout");
        }
      } catch (error) {
        console.error("Stripe Checkout error:", error);
        toast.error("Failed to redirect to payment.");
      }
      return;
    }

    saveScrollPosition({
      currentPage: pageState.pagination.currentPage,
      totalItems: pageState.restaurants.length
    })
    saveFilterState()
    const url = offerId ? `/restaurant/${restaurantId}?offerId=${offerId}` : `/restaurant/${restaurantId}`
    router.push(url)
  }, [saveScrollPosition, saveFilterState, pageState.pagination.currentPage, pageState.restaurants.length, router, user])

  const visibleRestaurants = useMemo(() => {
    return pageState.restaurants.filter((restaurant) => (restaurant.offers?.length ?? 0) > 0)
  }, [pageState.restaurants])

  const showMainListSkeleton = useMemo(
    () =>
      pageState.loadingListReset ||
      (pageState.loading && pageState.restaurants.length === 0),
    [pageState.loadingListReset, pageState.loading, pageState.restaurants.length]
  )

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

  // Compute the dynamic section title
  const selectedArea = useMemo(() => {
    return metaState.areas.find(area => area.value === filterState.selectedLocationId)
  }, [metaState.areas, filterState.selectedLocationId])

  const sectionTitle = useMemo(() => {
    const locationPart = selectedArea?.label || ''
    const categoriesPart = filterState.selectedCuisines.length > 0
      ? filterState.selectedCuisines.join(', ')
      : 'Places to use your membership'

    if (locationPart && filterState.selectedCuisines.length > 0) {
      return `${locationPart} · ${categoriesPart}`
    } else if (locationPart) {
      return `${locationPart} · All member offer venues`
    } else if (filterState.selectedCuisines.length > 0) {
      return categoriesPart
    }

    return 'Places to use your membership'
  }, [selectedArea, filterState.selectedCuisines])

  // Determine if carousels should be shown
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

  // const handleUnlockClick = useCallback((restaurant: Restaurant) => {
  //   setUIState(prev => ({ ...prev, unlockModalRestaurant: restaurant }))
  // }, [])

  // const sortedCategories = useMemo(() => {
  //   if (metaState.categoriesLoading) return []

  //   // Get all categories from metaState.categories
  //   const categoriesFromMeta = [...metaState.categories]

  //   // Get clicked categories that might not be in metaState.categories
  //   const clickedCategoriesNotInMeta = filterState.selectedCuisineIds
  //     .filter(cuisineId => {
  //       // Check if this cuisine is already in metaState.categories
  //       const existsInMeta = categoriesFromMeta.some(cat => cat.id === cuisineId)
  //       if (existsInMeta) return false

  //       // Check if it's in loadedCategories (user clicked it)
  //       if (!loadedCategories.has(cuisineId)) return false

  //       // Find the cuisine name from cuisineTypes
  //       const cuisine = metaState.cuisineTypes.find(c => c.value === cuisineId)
  //       return !!cuisine
  //     })
  //     .map(cuisineId => {
  //       const cuisine = metaState.cuisineTypes.find(c => c.value === cuisineId)
  //       if (!cuisine) return null
  //       return {
  //         _id: cuisineId,
  //         id: cuisineId,
  //         name: cuisine.label,
  //         priority: 999,
  //         restaurantCount: 0,
  //         offersCount: 0,
  //         isGlobal: true // Assume global for clicked categories
  //       }
  //     })
  //     .filter(Boolean) as typeof categoriesFromMeta

  //   // Combine both lists
  //   const allCategories = [...categoriesFromMeta, ...clickedCategoriesNotInMeta]

  //   return allCategories
  //     .filter((category) => {
  //       if (category.isGlobal) return true
  //       return filterState.selectedLocationId && filterState.selectedLocationId !== 'all'
  //     })
  //     .filter((category) => {
  //       return loadedCategories.has(category.id)
  //     })
  //     .sort((a: any, b: any) => {
  //       if (clickedCategoryId === a.id && clickedCategoryId !== b.id) return -1
  //       if (clickedCategoryId === b.id && clickedCategoryId !== a.id) return 1

  //       const priorityA = a.priority ?? 999
  //       const priorityB = b.priority ?? 999
  //       if (priorityA !== priorityB) {
  //         return priorityA - priorityB
  //       }
  //       if (b.offersCount !== a.offersCount) {
  //         return b.offersCount - a.offersCount
  //       }
  //       return a.name.localeCompare(b.name)
  //     })
  // }, [metaState.categories, metaState.categoriesLoading, metaState.cuisineTypes, filterState.selectedLocationId, filterState.selectedCuisineIds, loadedCategories, clickedCategoryId])

  // const hasFilters = useMemo(() => {
  //   return !!(
  //     filterState.selectedLocationId || 
  //     filterState.selectedCuisineIds.length > 0 || 
  //     filterState.selectedDining.length > 0 || 
  //     filterState.selectedDayValues.length > 0 || 
  //     filterState.selectedMealTimes.length > 0 || 
  //     debouncedSearchTerm
  //   )
  // }, [
  //   filterState.selectedLocationId,
  //   filterState.selectedCuisineIds.length,
  //   filterState.selectedDining.length,
  //   filterState.selectedDayValues.length,
  //   filterState.selectedMealTimes.length,
  //   debouncedSearchTerm
  // ])

  // const otherCategoriesHaveData = useMemo(() => {
  //   return Object.keys(carouselVisibility).some(key => 
  //     key !== 'available-everywhere' && 
  //     carouselVisibility[key] === true
  //   )
  // }, [carouselVisibility])

  // const selectedArea = useMemo(() => {
  //   return metaState.areas.find(area => area.value === filterState.selectedLocationId)
  // }, [metaState.areas, filterState.selectedLocationId])
  // Redundant effect removed and logic moved to handleLocationSelect or consolidated filters effect
  return (
    <>
      <main className="min-h-screen bg-[#FAF9F7] pb-20">
        {/* Membership sales panel - only for non-members */}
        {showSalesPanel && (
          <section className="bg-gradient-to-br from-[#1C1917] via-[#262220] to-[#1C1917] py-6 md:py-8 relative overflow-hidden">
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
            {/* Soft red glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#DC3545]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#DC3545]/5 rounded-full blur-2xl" />
            
            <div className="container mx-auto px-4 relative">
              <div className="max-w-2xl mx-auto">
                {/* Membership pass card - elevated physical card feel */}
                <div className="bg-gradient-to-br from-[#2A2725] via-[#232120] to-[#1E1C1B] border border-[#3D3835]/60 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
                  {/* Card shine effect */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div className="absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-white/10 via-transparent to-transparent" />
                  
                  {/* Close button */}
                  <button
                    onClick={handleDismissSalesPanel}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[#78716C] hover:text-white transition-colors z-10"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  
                  {/* Top row with badge */}
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="bg-gradient-to-br from-[#DC3545] to-[#B91C2C] rounded-lg p-1.5 shadow-lg shadow-[#DC3545]/20">
                      <Ticket className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-[#DC3545] text-xs font-bold uppercase tracking-widest">Eatinout Member Pass</span>
                  </div>

                  {/* Main headline */}
                  <h1 className="text-xl md:text-2xl font-bold text-white mb-2.5 text-balance leading-tight">
                    Your eating out discount membership
                  </h1>
                  
                  {/* Subcopy */}
                  <p className="text-sm text-[#A8A29E] mb-5 text-pretty leading-relaxed">
                    Get member-only offers at restaurants, cafes and bars across Lancashire. Show your offer when you visit and save in venue.
                  </p>

                  {/* Price/trial row - more prominent */}
                  <div className="flex flex-wrap items-center gap-3 mb-5 p-3 bg-[#1C1917]/50 rounded-xl border border-[#3D3835]/40">
                    <span className="inline-flex items-center bg-gradient-to-r from-[#DC3545] to-[#B91C2C] text-white text-sm font-bold px-4 py-2 rounded-lg shadow-lg shadow-[#DC3545]/25">
                      7 days free
                    </span>
                    <span className="text-[#78716C] text-sm font-medium">then</span>
                    <span className="inline-flex items-center bg-white/10 backdrop-blur-sm text-white text-sm font-bold px-4 py-2 rounded-lg border border-white/10">
                      £4.99/month
                    </span>
                  </div>

                  {/* Membership benefit chips */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    <span className="inline-flex items-center gap-1.5 bg-[#3D3835]/60 text-[#E8E4DF] text-[11px] font-medium px-3 py-1.5 rounded-full border border-[#4A4543]/40">
                      <Store className="h-3 w-3 text-[#DC3545]" />
                      500+ venues
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-[#3D3835]/60 text-[#E8E4DF] text-[11px] font-medium px-3 py-1.5 rounded-full border border-[#4A4543]/40">
                      <BadgeCheck className="h-3 w-3 text-[#DC3545]" />
                      Member-only offers
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-[#3D3835]/60 text-[#E8E4DF] text-[11px] font-medium px-3 py-1.5 rounded-full border border-[#4A4543]/40">
                      Use in venue
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-[#3D3835]/60 text-[#E8E4DF] text-[11px] font-medium px-3 py-1.5 rounded-full border border-[#4A4543]/40">
                      Cancel anytime
                    </span>
                  </div>

                  {/* CTA buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href="/start"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-[#DC3545] to-[#B91C2C] hover:from-[#B91C2C] hover:to-[#991B1B] text-white text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-[#DC3545]/25 hover:shadow-[#DC3545]/40"
                    >
                      Start 7 days free
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => {
                        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
                        if (searchInput) {
                          searchInput.focus()
                          searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }
                      }}
                      className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-[#E8E4DF] hover:text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all border border-white/10"
                    >
                      Browse offers
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Not delivery clarification - warmer background */}
        <div className="bg-gradient-to-r from-[#FFFCF9] via-[#FDF8F4] to-[#FFFCF9] border-b border-[#E8E4DF] py-3">
          <div className="container mx-auto px-4">
            <p className="text-center text-xs text-[#78716C]">
              <span className="font-semibold text-[#57534E]">Not delivery. Not takeaway.</span> Just local offers to use when you eat out.
            </p>
          </div>
        </div>

        <section className="sticky top-16 z-30 bg-white/95 backdrop-blur-sm border-b border-[#E8E4DF] py-4 shadow-sm">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto space-y-3">
              {/* Row 1: Full-width search bar - more premium */}
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#DC3545] w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search places with member offers"
                  value={filterState.searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-11 pr-10 py-6 text-base border-[#E8E4DF] rounded-2xl focus:ring-2 focus:ring-[#DC3545] focus:border-transparent bg-[#FAF9F7] shadow-sm hover:shadow-md transition-shadow"
                />
                {filterState.searchTerm && (
                  <button
                    onClick={() => {
                      setFilterState(prev => ({ ...prev, searchTerm: "" }))
                      clearFilterState()
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#78716C] hover:text-[#1C1917] transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Row 2: Location + Filters side by side - premium controls */}
              <div className="flex items-center gap-3">
                {/* Choose location button - takes available space */}
                <div className="relative flex-1" ref={locationDropdownRef}>
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-[#FFFCF9] to-[#FAF9F7] hover:from-[#FAF9F7] hover:to-[#F5F3F0] border border-[#E8E4DF] rounded-2xl text-[#1C1917] font-medium transition-all text-sm shadow-sm hover:shadow-md"
                    onClick={() => setUIState(prev => ({ ...prev, showLocationDropdown: !prev.showLocationDropdown }))}
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#DC3545]/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-[#DC3545]" />
                    </div>
                    <span className="truncate font-semibold">{filterState.selectedLocation || "Choose location"}</span>
                    {filterState.selectedLocation && (
                      <span className="text-[#DC3545] text-xs font-medium flex-shrink-0 ml-auto">change</span>
                    )}
                  </button>

                  {uiState.showLocationDropdown && !metaState.areasLoading && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-[#E8E4DF] rounded-2xl shadow-xl max-h-60 overflow-y-auto z-20 min-w-[220px]">
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
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className={`h-3.5 w-3.5 ${!filterState.selectedLocation ? 'text-[#DC3545]' : 'text-gray-400'}`} />
                          <span>All Locations</span>
                        </div>
                      </button> */}
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

                {/* Filters button - matching premium style */}
                <button
                  onClick={() => setUIState(prev => ({ ...prev, showFilters: !prev.showFilters }))}
                  className="flex items-center justify-center gap-2.5 px-4 py-3 bg-gradient-to-r from-[#FFFCF9] to-[#FAF9F7] hover:from-[#FAF9F7] hover:to-[#F5F3F0] border border-[#E8E4DF] rounded-2xl transition-all flex-shrink-0 shadow-sm hover:shadow-md"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#DC3545]/10 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4 text-[#DC3545]" />
                  </div>
                  <span className="text-[#1C1917] font-semibold text-sm">Filters</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {uiState.showFilters && (
          <div className="bg-white border-b border-[#E8E4DF] px-4 pb-6 space-y-4 md:space-y-6">
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
                    saveFilterState()
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

        {/* Conditionally render AuthCarouselList */}
        {shouldShowCarousels && (
          <div className="bg-[#FFFBF7] pb-6" id="restaurant-list">
            <AuthCarouselList
              areaId={filterState.selectedLocationId || undefined}
              getAreaNames={getAreaNames}
              areas={metaState.areas}
              onNavigate={handleRestaurantNavigate}
              favorites={favorites}
              onHeartClick={handleHeartClick}
              searchTerm={debouncedSearchTerm}
              selectedCuisineIds={filterState.selectedCuisineIds}
              selectedDining={filterState.selectedDining}
              selectedDayValues={filterState.selectedDayValues}
              selectedMealTimes={filterState.selectedMealTimes}
            />
          </div>
        )}


        <section className="px-4 py-8 bg-[#FAF9F7]">
          <h2 className="text-xl font-bold text-[#1C1917] mb-4">{sectionTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {showMainListSkeleton &&
              [1, 2, 3, 4, 5, 6].map((i) => (
                <RestaurantCardSkeleton key={i} />
              ))}
            {!pageState.loadingListReset &&
              visibleRestaurants.map((restaurant) => {
                const location = Array.isArray(restaurant.area)
                  ? getAreaNames(restaurant.area, metaState.areas)
                  : restaurant.location

                const offers = restaurant.offers?.map(offer => ({
                  discount: offer.title,
                  unlimited: !offer.totalCodes,
                  remainingCount: offer.totalCodes ? offer.totalCodes - (offer.codesRedeemed || 0) : undefined
                })) || []
                const heroOffer = offers[0]

                return (
                  <div key={restaurant.id} onClick={() => handleRestaurantNavigate(restaurant.id)} className="w-full group">
                    <div className="w-full">
                      <div className="bg-gradient-to-br from-[#FFFCF9] to-[#FDF8F4] rounded-3xl shadow-md hover:shadow-xl transition-all overflow-hidden border border-[#E8E4DF] cursor-pointer">
                        {/* Image area - taller for premium feel */}
                        <div className="relative h-[140px] w-full overflow-hidden">
                          {restaurant.imageUrl ? (
                            <>
                              <Image
                                src={restaurant.imageUrl}
                                alt={restaurant.name}
                                fill
                                className="object-cover"
                                loading="lazy"
                                quality={75}
                                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              />
                              {/* Dark gradient overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                            </>
                          ) : (
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
                            <h3 className="font-bold text-[#1C1917] text-base line-clamp-1 flex-1">{restaurant.name}</h3>
                            <button
                              className={`transition-all flex-shrink-0 p-1.5 rounded-full ${favorites.has(restaurant.id)
                                ? "text-[#DC3545] bg-[#DC3545]/10"
                                : "text-[#D6D3D1] hover:text-[#DC3545] hover:bg-[#DC3545]/5"
                                }`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleHeartClick(e, restaurant.id, restaurant.name);
                              }}
                              disabled={favoritesLoading.has(restaurant.id)}
                              aria-label={favorites.has(restaurant.id) ? "Remove from favourites" : "Add to favourites"}
                            >
                              {favoritesLoading.has(restaurant.id) ? (
                                <svg
                                  className="animate-spin h-4 w-4 text-[#DC3545]"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  />
                                </svg>
                              ) : (
                                <Heart
                                  className={`h-4 w-4 ${favorites.has(restaurant.id) ? "fill-[#DC3545]" : ""
                                    }`}
                                />
                              )}
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
                            {restaurant.city}<span className="text-[#D6D3D1]">·</span>{restaurant.zipCode}
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
                              {user ? (
                                <>
                                  View voucher code
                                  <ChevronRight className="h-4 w-4" />
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3.5 w-3.5" />
                                  Join to view voucher
                                  <ChevronRight className="h-4 w-4" />
                                </>
                              )}
                            </span>
                            <span className="text-[10px] text-[#A8A29E] font-medium">Included with Eatinout</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            {!pageState.loading &&
              !pageState.loadingListReset &&
              hasFilters &&
              visibleRestaurants.length === 0 && (
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

          {pageState.loading &&
            pageState.restaurants.length > 0 &&
            !pageState.loadingListReset && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {[1, 2, 3].map((i) => (
                  <RestaurantCardSkeleton key={i} />
                ))}
              </div>
            )}
        </section>

        <WelcomeLocationModal
          isOpen={showWelcomeLocationModal}
          onClose={() => setShowWelcomeLocationModal(false)}
          onLocationSelect={handleWelcomeLocationSelect}
        />
      </main>
    </>
  )
}
