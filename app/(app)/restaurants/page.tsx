"use client";
import {
  Search,
  SlidersHorizontal,
  X,
  Tag,
  Heart,
  ArrowDownWideNarrow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useScrollPreservation } from "@/hooks/use-scroll-preservation";
import { FlavourSection } from "@/components/FlavourSection";
import { AuthCarouselList } from "@/components/AuthCarouselList";
import { RestaurantCardSkeleton } from "@/components/restaurant-card-skeleton";
import Image from "next/image";
import { toast } from "react-toastify";
import { useAuth } from "@/context/auth-context";
import {
  DEFAULT_MAP_CENTER_LAT_LNG,
  DEFAULT_MAP_LOCATION_LABEL,
  DEFAULT_RESTAURANT_DISTANCE_FILTER_MILES,
  RESTAURANT_DISTANCE_OPTIONS_MILES,
  isRestaurantDistanceFilterMiles,
  type RestaurantDistanceFilterMiles,
} from "@/lib/constants";
import {
  USER_LAT_LNG_SESSION_KEY,
  USER_LOCATION_STORAGE_EVENT,
} from "@/lib/user-location-session";
import dynamic from "next/dynamic";

const UserLocationMap = dynamic(
  () => import("@/components/user-location-map"),
  {
    ssr: false,
  },
);

type Category = {
  id: string;
  name: string;
};

type OfferData = {
  id: string;
  title: string;
  tags: string[];
  startDate?: string;
  expiryDate?: string;
  status: string;
  totalCodes: number;
  codesRedeemed: number;
  expiresAt?: string;
};

type Restaurant = {
  id: string;
  slug: string;
  name: string;
  /** Miles from search origin (user or default); computed on API only. */
  distanceMiles?: number;
  lat?: number | null;
  lng?: number | null;
  cuisine?: string;
  location: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  addressLink?: string;
  area: string | string[];
  rating: number;
  dealsCount: number;
  offers: OfferData[];
  imageUrl: string;
  dineIn: boolean;
  dineOut: boolean;
  priceRange: string;
  openingHours: string;
  category: Category[];
  deliveryAvailable: boolean;
};

type RestaurantsListPageResponse = {
  success: boolean;
  message?: string;
  restaurants: Restaurant[];
  pagination: {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage?: boolean;
    limit?: number;
    totalRestaurants?: number;
  };
};

const DEFAULT_RESTAURANT_LIST_SORT = "closest" as const;
type RestaurantListSort = typeof DEFAULT_RESTAURANT_LIST_SORT;

function isRestaurantListSort(v: unknown): v is RestaurantListSort {
  return v === DEFAULT_RESTAURANT_LIST_SORT;
}

type RestaurantsListFilters = {
  area: string;
  search: string;
  categoryId: string;
  dineIn: boolean;
  dineOut: boolean;
  days: string;
  mealTimes: string;
  maxDistanceMiles: RestaurantDistanceFilterMiles;
  userLat: number;
  userLng: number;
  sortBy: RestaurantListSort;
};

const RESTAURANTS_LIST_QUERY_KEY_ROOT = ["restaurants", "all"] as const;

function buildRestaurantsListParams(
  page: number,
  f: RestaurantsListFilters,
): URLSearchParams {
  const params = new URLSearchParams({
    page: String(page),
    limit: "12",
  });
  if (f.area) params.append("area", f.area);
  if (f.search) params.append("search", f.search);
  if (f.categoryId) params.append("categoryId", f.categoryId);
  if (f.dineIn) params.append("dineIn", "true");
  if (f.dineOut) params.append("dineOut", "true");
  if (f.days) params.append("days", f.days);
  if (f.mealTimes) params.append("mealTimes", f.mealTimes);
  params.append("maxDistanceMiles", String(f.maxDistanceMiles));
  params.append("userLat", String(f.userLat));
  params.append("userLng", String(f.userLng));
  params.append("sortBy", f.sortBy);
  return params;
}

async function fetchRestaurantsListPage(
  page: number,
  f: RestaurantsListFilters,
  signal?: AbortSignal,
): Promise<RestaurantsListPageResponse> {
  const params = buildRestaurantsListParams(page, f);
  const response = await fetch(`/api/restaurants/all?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { message?: string }).message ||
        `Server error: ${response.status}`,
    );
  }
  const data = (await response.json()) as RestaurantsListPageResponse;
  console.log(data.restaurants);

  if (!data.success || !Array.isArray(data.restaurants)) {
    throw new Error(data.message || "Invalid response format");
  }
  return data;
}

type AreaOption = {
  value: string;
  label: string;
};

type CuisineOption = {
  value: string;
  label: string;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface FilterState {
  searchTerm: string;
  locationSearch: string;
  selectedLocation: string;
  selectedLocationId: string;
  selectedCuisines: string[];
  selectedCuisineIds: string[];
  selectedDays: string[];
  selectedDayValues: string[];
  selectedDining: string[];
  selectedMealTimes: string[];
  maxDistanceMiles: RestaurantDistanceFilterMiles;
  listSort: RestaurantListSort;
}

interface MetaState {
  areas: AreaOption[];
  areasLoading: boolean;
  areasError: string | null;
  cuisineTypes: CuisineOption[];
  cuisineTypesLoading: boolean;
  cuisineTypesError: string | null;
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
  showLocationDropdown: boolean;
  showFilters: boolean;
  showMobileMenu: boolean;
  showAllCuisines: boolean;
  unlockModalRestaurant: Restaurant | null;
}

const DAYS_AVAILABLE = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
] as const;

const MEAL_TIMES = [
  "Morning 7am-12pm",
  "Afternoon 12pm-5pm",
  "Evening 5pm-late!",
] as const;

const DAY_MAP: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export default function RestaurantsPage() {
  const { saveScrollPosition, getSavedPageState, clearScrollPosition } =
    useScrollPreservation();
  const router = useRouter();
  const { user, isAuthenticated, authLoading } = useAuth();
  // UIState ke saath yeh state add karein
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesLoading, setFavoritesLoading] = useState<Set<string>>(
    new Set(),
  );

  // User ke favorites fetch karein
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;

      try {
        const res = await fetch("/api/favorites", {
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();

        if (data.success && data.restaurants) {
          const favIds: any = new Set(
            data.restaurants.map((r: any) => r._id || r.id),
          );
          setFavorites(favIds);
        }
      } catch (err) {
        console.error("Failed to fetch favorites:", err);
      }
    };

    fetchFavorites();
  }, [user]);

  const handleHeartClick = useCallback(
    async (
      e: React.MouseEvent,
      restaurantId: string,
      restaurantName: string,
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
            userId:
              (user as any).id || (user as any)._id || (user as any).userId,
          }),
        });
      } catch (err) {
        console.error("Favorite toggle error:", err);
      }
    },
    [user],
  );

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
    selectedMealTimes: [],
    maxDistanceMiles: DEFAULT_RESTAURANT_DISTANCE_FILTER_MILES,
    listSort: DEFAULT_RESTAURANT_LIST_SORT,
  });

  const [userOrigin, setUserOrigin] = useState<{ lat: number; lng: number }>(
    () => ({
      lat: DEFAULT_MAP_CENTER_LAT_LNG.lat,
      lng: DEFAULT_MAP_CENTER_LAT_LNG.lng,
    }),
  );

  /** True when `userLatLng` in sessionStorage is a saved device location (not default center). */
  const [isUserLocationShared, setIsUserLocationShared] = useState(false);

  const [uiState, setUIState] = useState<UIState>({
    showLocationDropdown: false,
    showFilters: false,
    showMobileMenu: false,
    showAllCuisines: false,
    unlockModalRestaurant: null,
  });

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
  });

  const [carouselVisibility, setCarouselVisibility] = useState<
    Record<string, boolean>
  >({
    "available-everywhere": true,
  });

  // const [loadedCategories, setLoadedCategories] = useState<Set<string>>(new Set())
  // const [clickedCategoryId, setClickedCategoryId] = useState<string | null>(null)

  const debouncedSearchTerm = useDebounce(filterState.searchTerm, 500);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const scrollRestoreTargetPageRef = useRef<number | null>(null);

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
      maxDistanceMiles: filterState.maxDistanceMiles,
      listSort: filterState.listSort,
    };
    sessionStorage.setItem("restaurantFilters", JSON.stringify(filterData));
  }, [filterState]);

  const restoreFilterState = useCallback(() => {
    try {
      const savedFilters = sessionStorage.getItem("restaurantFilters");
      if (savedFilters) {
        const savedState = JSON.parse(savedFilters);
        setFilterState({
          searchTerm: savedState.searchTerm || "",
          locationSearch: "",
          selectedLocation: savedState.selectedLocation || "",
          selectedLocationId: savedState.selectedLocationId || "",
          selectedCuisines: savedState.selectedCuisines || [],
          selectedCuisineIds: savedState.selectedCuisineIds || [],
          selectedDays: savedState.selectedDays || [],
          selectedDayValues: savedState.selectedDayValues || [],
          selectedDining: savedState.selectedDining || [],
          selectedMealTimes: savedState.selectedMealTimes || [],
          maxDistanceMiles:
            typeof savedState.maxDistanceMiles === "number" &&
            isRestaurantDistanceFilterMiles(savedState.maxDistanceMiles)
              ? savedState.maxDistanceMiles
              : DEFAULT_RESTAURANT_DISTANCE_FILTER_MILES,
          listSort: isRestaurantListSort(savedState.listSort)
            ? savedState.listSort
            : DEFAULT_RESTAURANT_LIST_SORT,
        });
        // Keep filter panel closed on load; only filter values are restored.
        setUIState((prev) => ({
          ...prev,
          showFilters: false,
        }));
      }
    } catch (error) {
      console.error("Failed to restore filter state:", error);
    }
  }, []);

  const clearFilterState = useCallback(() => {
    sessionStorage.removeItem("restaurantFilters");
  }, []);

  const restaurantsListFilters = useMemo<RestaurantsListFilters>(
    () => ({
      area:
        filterState.selectedLocationId &&
        filterState.selectedLocationId !== "all"
          ? filterState.selectedLocationId
          : "",
      search: debouncedSearchTerm.trim(),
      categoryId: filterState.selectedCuisineIds.join(","),
      dineIn: filterState.selectedDining.includes("dine-in"),
      dineOut: filterState.selectedDining.includes("takeaway"),
      days: filterState.selectedDayValues.join(","),
      mealTimes: filterState.selectedMealTimes.join(","),
      maxDistanceMiles: filterState.maxDistanceMiles,
      userLat: userOrigin.lat,
      userLng: userOrigin.lng,
      sortBy: filterState.listSort,
    }),
    [
      filterState.selectedLocationId,
      debouncedSearchTerm,
      filterState.selectedCuisineIds,
      filterState.selectedDining,
      filterState.selectedDayValues,
      filterState.selectedMealTimes,
      filterState.maxDistanceMiles,
      filterState.listSort,
      userOrigin.lat,
      userOrigin.lng,
    ],
  );

  const {
    data: restaurantsQueryData,
    error: restaurantsQueryError,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isPending,
  } = useInfiniteQuery({
    queryKey: [
      ...RESTAURANTS_LIST_QUERY_KEY_ROOT,
      restaurantsListFilters,
    ] as const,
    queryFn: async ({ pageParam, signal }) => {
      return fetchRestaurantsListPage(
        pageParam as number,
        restaurantsListFilters,
        signal,
      );
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasNextPage
        ? lastPage.pagination.currentPage + 1
        : undefined,
    enabled: filtersHydrated,
  });

  const restaurants = useMemo(
    () => restaurantsQueryData?.pages.flatMap((p) => p.restaurants) ?? [],
    [restaurantsQueryData],
  );

  const restaurantsListReportedPage = useMemo(() => {
    const pages = restaurantsQueryData?.pages;
    if (!pages?.length) return 1;
    return pages[pages.length - 1].pagination.currentPage;
  }, [restaurantsQueryData]);

  const listErrorMessage =
    restaurantsQueryError instanceof Error
      ? restaurantsQueryError.message
      : restaurantsQueryError
        ? String(restaurantsQueryError)
        : null;

  const listLoadingInitial =
    isPending || (isFetching && restaurants.length === 0);
  const listLoadingMore = isFetchingNextPage;

  useEffect(() => {
    const readOrigin = () => {
      try {
        const raw = sessionStorage.getItem(USER_LAT_LNG_SESSION_KEY);
        if (!raw) {
          setIsUserLocationShared(false);
          setUserOrigin({
            lat: DEFAULT_MAP_CENTER_LAT_LNG.lat,
            lng: DEFAULT_MAP_CENTER_LAT_LNG.lng,
          });
          return;
        }
        const parsed = JSON.parse(raw) as { lat?: unknown; lng?: unknown };
        if (
          typeof parsed.lat === "number" &&
          typeof parsed.lng === "number" &&
          Number.isFinite(parsed.lat) &&
          Number.isFinite(parsed.lng)
        ) {
          setIsUserLocationShared(true);
          setUserOrigin({ lat: parsed.lat, lng: parsed.lng });
        } else {
          setIsUserLocationShared(false);
          setUserOrigin({
            lat: DEFAULT_MAP_CENTER_LAT_LNG.lat,
            lng: DEFAULT_MAP_CENTER_LAT_LNG.lng,
          });
        }
      } catch {
        setIsUserLocationShared(false);
        setUserOrigin({
          lat: DEFAULT_MAP_CENTER_LAT_LNG.lat,
          lng: DEFAULT_MAP_CENTER_LAT_LNG.lng,
        });
      }
    };

    readOrigin();
    window.addEventListener(USER_LOCATION_STORAGE_EVENT, readOrigin);
    return () =>
      window.removeEventListener(USER_LOCATION_STORAGE_EVENT, readOrigin);
  }, []);

  useEffect(() => {
    restoreFilterState();
    setFiltersHydrated(true);
  }, [restoreFilterState]);

  useLayoutEffect(() => {
    const saved = getSavedPageState();
    scrollRestoreTargetPageRef.current =
      saved && saved.currentPage > 1 ? saved.currentPage : null;
  }, [getSavedPageState]);

  useEffect(() => {
    const target = scrollRestoreTargetPageRef.current;
    if (target == null || target <= 1) return;
    if (!restaurantsQueryData?.pages.length) return;
    const loadedCount = restaurantsQueryData.pages.length;
    if (loadedCount >= target) {
      scrollRestoreTargetPageRef.current = null;
      return;
    }
    if (!hasNextPage) {
      scrollRestoreTargetPageRef.current = null;
      return;
    }
    if (!isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [
    restaurantsQueryData?.pages.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    restaurantsQueryData,
  ]);

  const loadMoreRestaurants = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const handleScroll = () => {
      if (isFetchingNextPage || !hasNextPage) return;

      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollTop + windowHeight >= documentHeight - 500) {
        loadMoreRestaurants();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isFetchingNextPage, hasNextPage, loadMoreRestaurants]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilterState((prev) => ({ ...prev, searchTerm: e.target.value }));
      clearScrollPosition();
      clearFilterState();
    },
    [clearScrollPosition, clearFilterState],
  );

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [areasResponse, cuisinesResponse] = await Promise.all([
          fetch("/api/areas", { next: { revalidate: 300 } }),
          fetch("/api/admin/categories?dropdown=true", {
            next: { revalidate: 300 },
          }),
          // fetch("/api/categories", { next: { revalidate: 60 } })
        ]);

        if (areasResponse.ok) {
          const areasData = await areasResponse.json();
          if (areasData.success && areasData.areas) {
            const transformedAreas = areasData.areas
              .filter((area: any) => !area.hideRestaurant)
              .map((area: any) => ({
                value: area._id,
                label: area.name,
              }));

            setMetaState((prev) => ({
              ...prev,
              areas: transformedAreas,
              areasLoading: false,
            }));
          } else {
            throw new Error(areasData.message || "Failed to fetch areas");
          }
        } else {
          setMetaState((prev) => ({
            ...prev,
            areasError: "Failed to fetch areas",
            areasLoading: false,
          }));
        }

        if (cuisinesResponse.ok) {
          const cuisinesData = await cuisinesResponse.json();
          if (cuisinesData.success && Array.isArray(cuisinesData.categories)) {
            const transformedCategories = cuisinesData.categories
              .filter((cat: { isActive: boolean }) => cat.isActive)
              .map(
                (category: { _id: string; name: string; image?: string }) => ({
                  value: category._id,
                  label: category.name,
                  image: category.image || undefined,
                }),
              );
            // .sort((a: { label: string }, b: { label: string }) =>
            //   a.label.localeCompare(b.label)
            // )

            setMetaState((prev) => ({
              ...prev,
              cuisineTypes: transformedCategories,
              cuisineTypesLoading: false,
            }));
          } else {
            throw new Error(cuisinesData.message || "Failed to fetch cuisines");
          }
        } else {
          setMetaState((prev) => ({
            ...prev,
            cuisineTypesError: "Failed to fetch cuisines",
            cuisineTypesLoading: false,
          }));
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
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setMetaState((prev) => ({
          ...prev,
          areasError: errorMessage,
          cuisineTypesError: errorMessage,
          categoriesError: errorMessage,
          areasLoading: false,
          cuisineTypesLoading: false,
          // categoriesLoading: false
        }));
      }
    };

    fetchMetadata();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(event.target as Node)
      ) {
        setUIState((prev) => ({ ...prev, showLocationDropdown: false }));
      }
    };

    if (uiState.showLocationDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [uiState.showLocationDropdown]);

  const filteredLocations = useMemo(() => {
    if (!filterState.locationSearch) return metaState.areas;
    const searchLower = filterState.locationSearch.toLowerCase();
    return metaState.areas.filter((area) =>
      area.label.toLowerCase().includes(searchLower),
    );
  }, [metaState.areas, filterState.locationSearch]);

  const toggleCuisine = useCallback(
    (cuisineId: string, cuisineLabel: string) => {
      const isAdding = !filterState.selectedCuisineIds.includes(cuisineId);

      const newSelectedCuisineIds = isAdding
        ? [...filterState.selectedCuisineIds, cuisineId]
        : filterState.selectedCuisineIds.filter((id) => id !== cuisineId);
      const newSelectedCuisines = isAdding
        ? [...filterState.selectedCuisines, cuisineLabel]
        : filterState.selectedCuisines.filter(
            (label) => label !== cuisineLabel,
          );

      setFilterState((prev) => ({
        ...prev,
        selectedCuisineIds: newSelectedCuisineIds,
        selectedCuisines: newSelectedCuisines,
      }));
    },
    [filterState.selectedCuisineIds, filterState.selectedCuisines],
  );

  const toggleDay = useCallback((dayValue: string, dayLabel: string) => {
    setFilterState((prev) => ({
      ...prev,
      selectedDayValues: prev.selectedDayValues.includes(dayValue)
        ? prev.selectedDayValues.filter((v) => v !== dayValue)
        : [...prev.selectedDayValues, dayValue],
      selectedDays: prev.selectedDays.includes(dayLabel)
        ? prev.selectedDays.filter((l) => l !== dayLabel)
        : [...prev.selectedDays, dayLabel],
    }));
  }, []);

  const toggleDining = useCallback((option: string) => {
    setFilterState((prev) => ({
      ...prev,
      selectedDining: prev.selectedDining.includes(option)
        ? prev.selectedDining.filter((o) => o !== option)
        : [...prev.selectedDining, option],
    }));
  }, []);

  const toggleMealTime = useCallback((mealTime: string) => {
    setFilterState((prev) => ({
      ...prev,
      selectedMealTimes: prev.selectedMealTimes.includes(mealTime)
        ? prev.selectedMealTimes.filter((m) => m !== mealTime)
        : [...prev.selectedMealTimes, mealTime],
    }));
  }, []);

  const setMaxDistanceMiles = useCallback(
    (miles: RestaurantDistanceFilterMiles) => {
      setFilterState((prev) => ({ ...prev, maxDistanceMiles: miles }));
    },
    [],
  );

  const mapDaysToDisplay = useCallback((tags: string[]) => {
    return tags.map((tag) => DAY_MAP[tag.toLowerCase()] || tag).filter(Boolean);
  }, []);

  const getDayLabel = useCallback((days: string[]) => {
    if (days.length === 7) return "All Week";
    if (days.length > 1) return "Multi Days";
    return days[0];
  }, []);

  const getAreaNames = useCallback(
    (areaData: string | string[], areasList: AreaOption[]) => {
      const areaIds = Array.isArray(areaData) ? areaData : [areaData];
      const names = areaIds
        .map((areaId) => {
          const area = areasList.find((a) => a.value === areaId);
          return area ? area.label : null;
        })
        .filter(Boolean);
      return names.length > 0 ? names.join(", ") : "Location not available";
    },
    [],
  );

  const handleRestaurantNavigate = useCallback(
    async (restaurantPathSegment: string, offerId?: string) => {
      if (authLoading) return;

      const returnPath =
        offerId != null && offerId !== ""
          ? `/restaurant/${restaurantPathSegment}?offerId=${encodeURIComponent(offerId)}`
          : `/restaurant/${restaurantPathSegment}`;

      if (!user || !isAuthenticated) {
        router.push(
          `/sign-up?returnTo=${encodeURIComponent(returnPath)}`,
        );
        return;
      }

      // Check if the user is a normal user without an active subscription
      if (
        user &&
        user.role === "user" &&
        (user.subscriptionStatus === "inactive" ||
          user.subscriptionStatus === "cancelled")
      ) {
        try {
          const response = await fetch("/api/payment/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email }),
          });
          const { url } = await response.json();
          if (response.ok && url) {
            sessionStorage.setItem("redirectUrl", returnPath);
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
        currentPage: restaurantsListReportedPage,
        totalItems: restaurants.length,
      });
      saveFilterState();
      router.push(returnPath);
    },
    [
      saveScrollPosition,
      saveFilterState,
      restaurantsListReportedPage,
      restaurants.length,
      router,
      user,
      isAuthenticated,
      authLoading,
    ],
  );

  const visibleRestaurants = useMemo(() => {
    return restaurants.filter(
      (restaurant) => (restaurant.offers?.length ?? 0) > 0,
    );
  }, [restaurants]);

  const hasFilters = useMemo(() => {
    return !!(
      filterState.selectedLocationId ||
      filterState.selectedCuisineIds.length > 0 ||
      filterState.selectedDining.length > 0 ||
      filterState.selectedDayValues.length > 0 ||
      filterState.selectedMealTimes.length > 0 ||
      filterState.maxDistanceMiles !==
        DEFAULT_RESTAURANT_DISTANCE_FILTER_MILES ||
      debouncedSearchTerm
    );
  }, [
    filterState.selectedLocationId,
    filterState.selectedCuisineIds.length,
    filterState.selectedDining.length,
    filterState.selectedDayValues.length,
    filterState.selectedMealTimes.length,
    filterState.maxDistanceMiles,
    debouncedSearchTerm,
  ]);

  // Compute the dynamic section title
  const selectedArea = useMemo(() => {
    return metaState.areas.find(
      (area) => area.value === filterState.selectedLocationId,
    );
  }, [metaState.areas, filterState.selectedLocationId]);

  const sectionTitle = useMemo(() => {
    const locationPart = selectedArea?.label || "";
    const categoriesPart =
      filterState.selectedCuisines.length > 0
        ? filterState.selectedCuisines.join(", ")
        : "All Restaurants";

    if (locationPart && filterState.selectedCuisines.length > 0) {
      return `${locationPart} · ${categoriesPart}`;
    } else if (locationPart) {
      return `${locationPart} · All Restaurants`;
    } else if (filterState.selectedCuisines.length > 0) {
      return categoriesPart;
    }

    return "All Restaurants";
  }, [selectedArea, filterState.selectedCuisines]);

  // Determine if carousels should be shown
  const shouldShowCarousels = useMemo(() => {
    // Hide carousels if there's an active search
    if (debouncedSearchTerm.trim()) {
      return false;
    }

    // Hide carousels if any categories are selected
    if (filterState.selectedCuisineIds.length > 0) {
      return false;
    }

    return true;
  }, [debouncedSearchTerm, filterState.selectedCuisineIds]);

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
  useEffect(() => {
    if (!filterState.selectedLocationId) return;
    clearScrollPosition();
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [filterState.selectedLocationId, clearScrollPosition]);

  return (
    <>
      <main className="min-h-screen bg-[#FFFBF7] pb-20">
        <section className="sticky top-16 z-30 bg-white border-b border-gray-100 py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px] flex-1">
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
                        setFilterState((prev) => ({ ...prev, searchTerm: "" }));
                        clearFilterState();
                      }}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <Select
                  value={filterState.listSort}
                  onValueChange={(v) =>
                    setFilterState((prev) => ({
                      ...prev,
                      listSort: v as RestaurantListSort,
                    }))
                  }
                >
                  <SelectTrigger
                    aria-label="Sort restaurants"
                    className="h-auto w-[152px] shrink-0 gap-2 rounded-xl border border-gray-200 px-3 py-3 text-[#DC3545] hover:border-[#DC3545] focus:ring-[#DC3545]"
                  >
                    <ArrowDownWideNarrow className="h-5 w-5 shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="closest">Closest</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() =>
                    setUIState((prev) => ({
                      ...prev,
                      showFilters: !prev.showFilters,
                    }))
                  }
                  aria-label={hasFilters ? "Filters (filters applied)" : "Filters"}
                  className="relative flex shrink-0 items-center justify-center gap-1.5 px-4 py-3 h-full rounded-xl border border-gray-200 hover:border-[#DC3545] transition-colors"
                >
                  {hasFilters && (
                    <span
                      className="pointer-events-none absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#DC3545] ring-2 ring-white"
                      aria-hidden
                    />
                  )}
                  <SlidersHorizontal className="w-5 h-5 text-[#DC3545]" />
                  <span className="text-[#DC3545] font-medium">Filters</span>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {uiState.showFilters && (
          <div className="bg-white border-b border-gray-100 px-4 pb-6 space-y-4 md:space-y-6">
            {filterState.selectedLocation && (
              <div className="flex items-center gap-2 pt-2">
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  {filterState.selectedLocation}
                </Badge>
                <button
                  onClick={() => {
                    setFilterState((prev) => ({
                      ...prev,
                      selectedLocation: "",
                      selectedLocationId: "",
                    }));
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            )}

            {(filterState.selectedMealTimes.length > 0 ||
              filterState.selectedCuisines.length > 0 ||
              filterState.selectedDays.length > 0 ||
              filterState.selectedDining.length > 0 ||
              filterState.maxDistanceMiles !==
                DEFAULT_RESTAURANT_DISTANCE_FILTER_MILES) && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {filterState.selectedMealTimes.map((mealTime) => (
                  <Badge
                    key={mealTime}
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    {mealTime}
                  </Badge>
                ))}
                {filterState.selectedCuisines.map((cuisine) => (
                  <Badge
                    key={cuisine}
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    {cuisine}
                  </Badge>
                ))}
                {filterState.selectedDays.map((day) => (
                  <Badge
                    key={day}
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    {day}
                  </Badge>
                ))}
                {filterState.selectedDining.map((dining) => (
                  <Badge
                    key={dining}
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    {dining === "dine-in" ? "Dine In" : "Takeaway"}
                  </Badge>
                ))}
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  Within {filterState.maxDistanceMiles} mi
                </Badge>
              </div>
            )}

            <div className="space-y-4 pt-4 md:pt-5 pb-4">
              <div>
                <label className="text-sm font-semibold mb-2 block text-foreground">
                  Days Available
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_AVAILABLE.map((day) => (
                    <Button
                      key={day.value}
                      variant={
                        filterState.selectedDayValues.includes(day.value)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => toggleDay(day.value, day.label)}
                      className={
                        filterState.selectedDayValues.includes(day.value)
                          ? "bg-primary hover:bg-primary/90 text-white rounded-2xl"
                          : "rounded-2xl"
                      }
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block text-foreground">
                  Dine In or Out
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={
                      filterState.selectedDining.includes("dine-in")
                        ? "default"
                        : "outline"
                    }
                    onClick={() => toggleDining("dine-in")}
                    className={
                      filterState.selectedDining.includes("dine-in")
                        ? "bg-primary hover:bg-primary/90 text-white rounded-2xl"
                        : "rounded-2xl"
                    }
                  >
                    Dine In
                  </Button>
                  <Button
                    variant={
                      filterState.selectedDining.includes("takeaway")
                        ? "default"
                        : "outline"
                    }
                    onClick={() => toggleDining("takeaway")}
                    className={
                      filterState.selectedDining.includes("takeaway")
                        ? "bg-primary hover:bg-primary/90 text-white rounded-2xl"
                        : "rounded-2xl "
                    }
                  >
                    Takeaway
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block text-foreground">
                  Meal Time
                </label>
                <div className="flex flex-col gap-2">
                  {MEAL_TIMES.map((mealTime) => (
                    <Button
                      key={mealTime}
                      variant={
                        filterState.selectedMealTimes.includes(mealTime)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => toggleMealTime(mealTime)}
                      className={
                        filterState.selectedMealTimes.includes(mealTime)
                          ? "bg-primary hover:bg-primary/90 text-white rounded-2xl"
                          : "rounded-2xl"
                      }
                    >
                      {mealTime}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block text-foreground">
                  Distance from you
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Uses your shared location on the map when available; otherwise
                  the default map area ({DEFAULT_MAP_LOCATION_LABEL}).
                </p>
                <div className="flex flex-wrap gap-2">
                  {RESTAURANT_DISTANCE_OPTIONS_MILES.map((miles) => (
                    <Button
                      key={miles}
                      type="button"
                      variant={
                        filterState.maxDistanceMiles === miles
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => setMaxDistanceMiles(miles)}
                      className={
                        filterState.maxDistanceMiles === miles
                          ? "bg-primary hover:bg-primary/90 text-white rounded-2xl"
                          : "rounded-2xl"
                      }
                    >
                      {miles} mi
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    setUIState((prev) => ({ ...prev, showFilters: false }));
                    clearScrollPosition();
                    saveFilterState();
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
                      selectedMealTimes: [],
                      maxDistanceMiles:
                        DEFAULT_RESTAURANT_DISTANCE_FILTER_MILES,
                      listSort: DEFAULT_RESTAURANT_LIST_SORT,
                    });
                    clearScrollPosition();
                    clearFilterState();
                  }}
                  className="flex-1 rounded-2xl"
                >
                  Reset
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setUIState((prev) => ({ ...prev, showFilters: false }))
                  }
                  className="flex-shrink-0"
                >
                  ✕
                </Button>
              </div>
            </div>
          </div>
        )}

        <section
          className="w-full border-b border-gray-100 bg-[#FFFBF7] py-4 sm:py-5 md:py-6"
          aria-label="Map near you"
        >
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
              <h2 className="text-sm font-semibold text-gray-900 sm:text-base">
                Explore nearby
              </h2>
              <span className="hidden text-xs text-gray-500 sm:inline">
                Pan &amp; zoom the map
              </span>
            </div>
            <div
              className="relative z-0 isolate overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/[0.04]
                h-[min(38vh,240px)] min-h-[200px] sm:h-64 sm:min-h-[240px] md:h-72 lg:h-80"
            >
              <UserLocationMap
                className="min-h-0"
                onViewDeal={handleRestaurantNavigate}
                restaurants={visibleRestaurants
                  .filter(
                    (restaurant) =>
                      typeof restaurant.lat === "number" &&
                      Number.isFinite(restaurant.lat) &&
                      typeof restaurant.lng === "number" &&
                      Number.isFinite(restaurant.lng),
                  )
                  .map((restaurant) => ({
                    id: restaurant.id,
                    slug:
                      restaurant.slug?.trim() ? restaurant.slug : restaurant.id,
                    name: restaurant.name,
                    lat: restaurant.lat as number,
                    lng: restaurant.lng as number,
                    distanceMiles: restaurant.distanceMiles,
                    imageUrl: restaurant.imageUrl || "/placeholder.svg",
                    offerSummary:
                      restaurant.offers?.[0]?.title?.trim() ||
                      (restaurant.dealsCount > 0
                        ? `${restaurant.dealsCount} active deals`
                        : "Special offers"),
                    firstOfferId: restaurant.offers?.[0]?.id,
                  }))}
              />
            </div>
            <p className="mt-2 text-center text-[11px] leading-snug text-gray-500 sm:text-left sm:text-xs">
              {isUserLocationShared
                ? "Showing restaurants around you"
                : `Showing restaurants around ${DEFAULT_MAP_LOCATION_LABEL}`}
            </p>
          </div>
        </section>

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

        <section className="px-4 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {sectionTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listErrorMessage && (
              <div className="col-span-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {listErrorMessage}
              </div>
            )}
            {listLoadingInitial &&
              !listErrorMessage &&
              restaurants.length === 0 &&
              [1, 2, 3, 4, 5, 6].map((i) => <RestaurantCardSkeleton key={i} />)}
            {visibleRestaurants.map((restaurant) => {
              const location = Array.isArray(restaurant.area)
                ? getAreaNames(restaurant.area, metaState.areas)
                : restaurant.location;

              const offers =
                restaurant.offers?.map((offer) => ({
                  discount: offer.title,
                  unlimited: !offer.totalCodes,
                  remainingCount: offer.totalCodes
                    ? offer.totalCodes - (offer.codesRedeemed || 0)
                    : undefined,
                })) || [];
              //Helper: Check if coming soon (0 or undefined)
              const heroOffer = offers[0];
              const isHeroComingSoon =
                heroOffer &&
                !heroOffer.unlimited &&
                (typeof heroOffer.remainingCount !== "number" ||
                  heroOffer.remainingCount <= 0);

              return (
                <div
                  key={restaurant.id}
                  onClick={() =>
                    handleRestaurantNavigate(
                      restaurant.slug?.trim() || restaurant.id,
                    )
                  }
                  className="w-full"
                >
                  <div className="w-full">
                    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 cursor-pointer">
                      <div className="relative h-[130px] w-full overflow-hidden">
                        <Image
                          src={restaurant.imageUrl || "/placeholder.svg"}
                          alt={restaurant.name}
                          fill
                          className="object-cover"
                          loading="lazy"
                          quality={75}
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />

                        <div className="absolute top-2 left-0 flex items-stretch">
                          <div className="bg-[#eb221c] text-white font-semibold text-xs px-2 py-1">
                            {/* {offers[0].discount} */}
                            {heroOffer?.discount}
                          </div>
                          {/* {!offers[0].unlimited && offers[0].remainingCount && offers[0].remainingCount > 0 && (
                            <div className="bg-white text-[#eb221c] font-medium text-xs px-2 py-1">
                              {offers[0].remainingCount} left!
                            </div>
                          )} */}
                          {!heroOffer?.unlimited &&
                            (heroOffer?.remainingCount &&
                            heroOffer.remainingCount > 0 ? (
                              <div className="bg-white text-[#eb221c] font-medium text-xs px-2 py-1">
                                {heroOffer.remainingCount} left!
                              </div>
                            ) : (
                              <div className="bg-white text-gray-500 font-medium text-xs px-2 py-1">
                                More coming soon
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="p-3 space-y-1.5 relative">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 flex-1 pr-2">
                            {restaurant.name}
                          </h3>
                          {/* Line ~1119 ke aas paas - Update heart button */}
                          <button
                            className={`transition-colors flex-shrink-0 ${
                              favorites.has(restaurant.id)
                                ? "text-[#eb221c]"
                                : "text-gray-300 hover:text-[#eb221c]"
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleHeartClick(
                                e,
                                restaurant.id,
                                restaurant.name,
                              );
                            }}
                            disabled={favoritesLoading.has(restaurant.id)} // ✅ Disable during loading
                            aria-label={
                              favorites.has(restaurant.id)
                                ? "Remove from favourites"
                                : "Add to favourites"
                            }
                          >
                            {favoritesLoading.has(restaurant.id) ? (
                              // ✅ Loading spinner
                              <svg
                                className="animate-spin h-4 w-4 text-[#eb221c]"
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
                                className={`h-4 w-4 ${
                                  favorites.has(restaurant.id)
                                    ? "fill-[#eb221c]"
                                    : ""
                                }`}
                              />
                            )}
                          </button>
                        </div>

                        <p className="text-gray-500 text-xs flex items-center gap-1">
                          <span className="inline-block w-3 h-3 text-gray-400">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                          </span>
                          {restaurant.city}
                          <span className="text-gray-400">·</span>
                          {restaurant.zipCode}
                        </p>

                        {/* <div className="overflow-x-auto scrollbar-hide -mx-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {offers.map((offer, index) => (
                              
                              <div
                                key={index}
                                className="flex-shrink-0 flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-2 py-1"
                              >
                                <Tag className="h-2.5 w-2.5 text-[#eb221c]" />
                                <span className="text-[10px] font-medium text-gray-700 whitespace-nowrap">{offer.discount}</span>
                                {!offer.unlimited && offer.remainingCount && offer.remainingCount > 0 && (
                                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                    {offer.remainingCount} left
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div> */}
                        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {offers.map((offer, index) => {
                              const isComingSoon =
                                !offer.unlimited &&
                                (typeof offer.remainingCount !== "number" ||
                                  offer.remainingCount <= 0);

                              return (
                                <div
                                  key={index}
                                  className="flex-shrink-0 flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-2 py-1"
                                >
                                  <Tag className="h-2.5 w-2.5 text-[#eb221c]" />
                                  <span className="text-[10px] font-medium text-gray-700 whitespace-nowrap">
                                    {offer.discount}
                                  </span>
                                  {!offer.unlimited &&
                                    (offer.remainingCount &&
                                    offer.remainingCount > 0 ? (
                                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                        {offer.remainingCount} left
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-orange-500 whitespace-nowrap">
                                        More coming soon
                                      </span>
                                    ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {!listLoadingInitial &&
              !listErrorMessage &&
              hasFilters &&
              visibleRestaurants.length === 0 && (
                <div className="col-span-full">
                  <div className="rounded-2xl border border-dashed border-[#DC3545]/30 bg-white p-6 text-center shadow-sm">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#DC3545]/10 text-[#DC3545]">
                      <Search className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      No matches found
                    </h3>
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
                            selectedMealTimes: [],
                            maxDistanceMiles:
                              DEFAULT_RESTAURANT_DISTANCE_FILTER_MILES,
                            listSort: DEFAULT_RESTAURANT_LIST_SORT,
                          });
                          clearScrollPosition();
                          clearFilterState();
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

          {listLoadingMore && restaurants.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {[1, 2, 3].map((i) => (
                <RestaurantCardSkeleton key={i} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
