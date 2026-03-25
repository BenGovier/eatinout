"use client"

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react"
import InfiniteScroll from "react-infinite-scroll-component"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "react-toastify"
import { Search, CheckCircle, XCircle, Eye, Edit, ArrowDownToLine, Trash2, Loader2, RefreshCw, Pin, X, EyeOff, Eye as EyeIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { exportRestaurantsToXLSX } from "@/lib/exportRestaurantsXLSX";
import { PinRestaurantModal } from "@/components/admin/PinRestaurantModal"

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup timer on unmount or value change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [value, delay])

  return debouncedValue
}

// Memoized Restaurant Row Component for better performance
const RestaurantRow = memo(({
  restaurant,
  activeTab,
  hidingId,
  onStatusChange,
  onPinClick,
  onHideToggle
}: {
  restaurant: any
  activeTab: string
  hidingId: string | null
  onStatusChange: (id: string, status: string) => void
  onPinClick: (restaurant: any) => void
  onHideToggle: (id: string, isHidden: boolean) => void
}) => {
  return (
    <TableRow key={restaurant._id}>
      <TableCell className="font-medium">
        <div>
          <div>{restaurant.name}</div>
          <div className="text-sm text-gray-500">{restaurant.email}</div>
        </div>
      </TableCell>
      <TableCell>
        {restaurant.ownerName || "N/A"}
      </TableCell>
      <TableCell>
        {restaurant.category?.[0]?.name}
        {restaurant?.category.length > 1 && (
          <span
            style={{ color: "red", cursor: "pointer", marginLeft: "6px" }}
          >
            +{restaurant.category.length - 1} more
          </span>
        )}
      </TableCell>
      <TableCell>
        {restaurant.areas ? (
          <div className="flex flex-wrap gap-1">
            {restaurant.areas.map((area: any, index: number) => (
              <span
                key={area.id}
                className="bg-gray-50 text-gray-700 px-2 py-0.5 rounded-full text-xs"
              >
                {area.name}
                {index < restaurant.areas.length - 1 && ', '}
              </span>
            ))}
          </div>
        ) : 'N/A'}
      </TableCell>

      <TableCell>
        <Badge
          variant="outline"
          className={
            restaurant.status === "approved"
              ? "bg-green-50 text-green-700 border-green-200"
              : restaurant.status === "pending"
                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : "bg-red-50 text-red-700 border-red-200"
          }
        >
          {restaurant.status.charAt(0).toUpperCase() + restaurant.status.slice(1)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {/* HOME PIN */}
          {restaurant.homePin?.isPinned && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
              🏠 Home (P: {restaurant.homePin.priority})
            </Badge>
          )}

          {/* AREA PINS */}
          {restaurant.areaPins && restaurant.areaPins.length > 0 && (
            <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
              📍 {restaurant.areaPins.length} Area
              {restaurant.areaPins.length > 1 ? "s" : ""}
            </Badge>
          )}

          {/* NOT PINNED */}
          {!restaurant.homePin?.isPinned &&
            (!restaurant.areaPins || restaurant.areaPins.length === 0) && (
              <span className="text-xs text-gray-400">Not pinned</span>
            )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold bg-gray-50 rounded-full w-7 h-7 flex items-center justify-center">
            {restaurant.totalOffersCount || 0}
          </div>
        </div>
      </TableCell>
      <TableCell>{new Date(restaurant.createdAt).toLocaleDateString('en-GB')}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPinClick(restaurant)}
            className="text-primary hover:text-primary/80"
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Pin className="w-4 h-4" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Pin to Top
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/restaurants/edit/${restaurant._id}`}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Edit className="w-4 h-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Edit Restaurant
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/restaurants/${restaurant._id}`}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Eye className="h-4 w-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    View Restaurant
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Link>
          </Button>

          {(restaurant.status === "pending" || restaurant.status === "rejected") && (
            <>
              {restaurant.status === "pending" && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onStatusChange(restaurant._id, "approved")}
                    className="text-green-600"
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <CheckCircle className="h-4 w-4" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Approve Restaurant
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onStatusChange(restaurant._id, "rejected")}
                    className="text-red-600"
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <XCircle className="h-4 w-4" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Reject Restaurant
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                  </Button>
                </>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onHideToggle(restaurant._id, activeTab === "hidden")}
            disabled={hidingId === restaurant._id}
            className={activeTab === "hidden" ? "text-green-600" : "text-orange-600"}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    {hidingId === restaurant._id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                    ) : activeTab === "hidden" ? (
                      <EyeIcon className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {activeTab === "hidden" ? "Unhide Restaurant" : "Hide Restaurant"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
})

export default function AdminRestaurantsPage() {
  const [activeTab, setActiveTab] = useState("active")
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [areaFilter, setAreaFilter] = useState("all")

  // Separate loading states for different scenarios
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [isFilterLoading, setIsFilterLoading] = useState(false)

  const [hidingId, setHidingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Pin modal state
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [selectedRestaurantForPin, setSelectedRestaurantForPin] = useState<any | null>(null)

  // Dynamic filter options
  const [filterOptions, setFilterOptions] = useState({
    areas: [],
    statuses: [],
    categories: []
  })

  // Global statistics
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    activeRestaurants: 0,
    pendingRestaurants: 0,
    rejectedRestaurants: 0,
    totalOffers: 0,
    activeOffers: 0
  })

  // Add a new state for export loading
  const [isExporting, setIsExporting] = useState(false)

  // Use debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const debouncedStatusFilter = useDebounce(statusFilter, 300)
  const debouncedAreaFilter = useDebounce(areaFilter, 300)

  const fetchRestaurants = useCallback(async () => {
    try {
      // Determine loading state based on page
      setIsDataLoading(true)
      setIsFilterLoading(page === 1)

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: debouncedSearchTerm,
        status: debouncedStatusFilter,
        area: debouncedAreaFilter
      })

      // Use different endpoint based on active tab
      const endpoint = activeTab === "hidden"
        ? `/api/admin/restaurants/hidden?${queryParams}`
        : `/api/admin/restaurants?${queryParams}`

      const response = await fetch(endpoint)

      if (!response.ok) {
        throw new Error("Failed to fetch restaurants")
      }

      const data = await response.json()

      if (data.success) {
        // Reset or append restaurants based on page
        setRestaurants(prevRestaurants =>
          page === 1 ? data.restaurants : [...prevRestaurants, ...data.restaurants]
        )

        // Update filter options and stats
        setFilterOptions(data.filters)
        setStats(data.stats)

        // Update pagination
        setHasMore(page < data.pagination.pages)
      } else {
        throw new Error(data.message || "Failed to fetch restaurants")
      }
    } catch (err: any) {
      console.error("Fetch restaurants error:", err)
      setRestaurants([])
      setHasMore(false)
      toast.error(err.message || "Failed to load restaurants")
    } finally {
      setIsDataLoading(false)
      setIsFilterLoading(false)
      setIsInitialLoading(false)
    }
  }, [page, debouncedSearchTerm, debouncedStatusFilter, debouncedAreaFilter, activeTab])

  // Reset page to 1 when filters change or tab changes
  useEffect(() => {
    setPage(1)
    setRestaurants([]) // Clear restaurants array when filters change
  }, [debouncedSearchTerm, debouncedStatusFilter, debouncedAreaFilter, activeTab])

  // Fetch restaurants when page, search, or filters change
  useEffect(() => {
    document.title = 'Restaurants'
    fetchRestaurants()
  }, [fetchRestaurants])

  // Set filtered restaurants to be the same as restaurants (since API already filters)
  // Use useMemo instead of useEffect for better performance
  const filteredRestaurants = useMemo(() => restaurants, [restaurants])

  // Memoize whether we have active filters
  const hasActiveFilters = useMemo(() => {
    return searchTerm !== '' || statusFilter !== 'all' || areaFilter !== 'all'
  }, [searchTerm, statusFilter, areaFilter])

  // Memoize empty state message
  const emptyStateMessage = useMemo(() => {
    if (hasActiveFilters) {
      return "Try adjusting your search or filters"
    }
    return activeTab === "hidden"
      ? "No hidden restaurants"
      : "No restaurants have been added yet"
  }, [hasActiveFilters, activeTab])

  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/restaurants/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update restaurant status")
      }

      // Update local state
      setRestaurants(prevRestaurants =>
        prevRestaurants.map((restaurant: any) => (restaurant._id === id ? { ...restaurant, status: newStatus } : restaurant))
      )
      toast.success(`Restaurant status has been updated to ${newStatus}.`)
    } catch (err: any) {
      console.error("Error updating restaurant status:", err)
      toast.error(err.message || "Failed to update restaurant status")
    }
  }, [])



  const handleHideToggle = useCallback(async (id: string, currentHiddenStatus: boolean) => {
    const action = currentHiddenStatus ? "unhide" : "hide"
    if (!confirm(`Are you sure you want to ${action} this restaurant?`)) return;

    setHidingId(id);
    try {
      const response = await fetch(`/api/admin/restaurants/${id}/hide`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hidden: !currentHiddenStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Hide/Unhide error:", errorData);
        throw new Error(errorData.message || `Failed to ${action} restaurant`);
      }

      toast.success(`Restaurant ${action === "hide" ? "hidden" : "unhidden"} successfully!`);

      // Remove from current list
      setRestaurants((prev) => prev.filter((restaurant) => restaurant._id !== id));

    } catch (err: any) {
      console.error(`Error ${action}ing restaurant:`, err);
      toast.error(err.message || `Failed to ${action} restaurant. Please try again.`);
    } finally {
      setHidingId(null);
    }
  }, []);

  // Add a new function to reset filters
  const resetFilters = useCallback(() => {
    setSearchTerm('')
    setStatusFilter('all')
    setAreaFilter('all')
    setPage(1) // Reset to first page
  }, [])

  // Handle pin modal
  const handlePinClick = useCallback((restaurant: any) => {
    setSelectedRestaurantForPin(restaurant)
    setPinModalOpen(true)
  }, [])

  // const handlePinSuccess = useCallback(() => {
  //   // Refresh the restaurant list after successful pin
  //   setPage(1)
  //   setRestaurants([]) // Clear to force re-fetch
  // }, [])

  const handlePinSuccess = useCallback(() => {
    setPinModalOpen(false)
    setSelectedRestaurantForPin(null)

    setIsFilterLoading(true)
    setPage(1)

    // force re-fetch without showing empty table
    fetchRestaurants()
  }, [fetchRestaurants])

  // Export handler with memoization
  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true)
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '10000',
        export: 'true',
        search: debouncedSearchTerm,
        status: debouncedStatusFilter,
        area: debouncedAreaFilter
      })

      // Use different endpoint based on active tab
      const endpoint = activeTab === "hidden"
        ? `/api/admin/restaurants/hidden?${queryParams}`
        : `/api/admin/restaurants?${queryParams}`

      const response = await fetch(endpoint)

      if (!response.ok) {
        throw new Error("Failed to fetch restaurants for export")
      }

      const data = await response.json()

      if (data.success) {
        // Pass false to show owner name (second parameter is hideOwnerName)
        exportRestaurantsToXLSX(data.restaurants, false)
        // toast.success(`Exported ${data.restaurants.length} ${activeTab === "hidden" ? "hidden" : ""} restaurants successfully!`)
      } else {
        toast.error("Failed to export restaurants")
      }
    } catch (error) {
      console.error("Export error:", error)
      toast.error("An error occurred while exporting restaurants")
    } finally {
      setIsExporting(false)
    }
  }, [debouncedSearchTerm, debouncedStatusFilter, debouncedAreaFilter, activeTab])

  // Render loading states and content
  const renderLoadingState = () => {
    // if (isInitialLoading) {
    //   return (
    //     <div className="py-8">
    //       <h1 className="text-2xl font-bold mb-6">Manage Restaurants</h1>
    //       <div className="flex justify-center items-center h-64">
    //         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    //         <span className="ml-2">Loading restaurants...</span>
    //       </div>
    //     </div>
    //   )
    // }

    return (
      <div className="py-8 overflow-hidden">
        <h1 className="text-2xl font-bold mb-6">Manage Restaurants</h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {activeTab === "hidden" ? "Hidden Restaurants" : "Total Restaurants"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.totalRestaurants}</div>
            </CardContent>
          </Card>
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.pendingRestaurants}</div>
            </CardContent>
          </Card>
          <Card className="w-full sm:col-span-2 md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Active Restaurants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.activeRestaurants}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active">Active Restaurants</TabsTrigger>
            <TabsTrigger value="hidden">Hidden Restaurants</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === "hidden" ? "Hidden Restaurants" : "Restaurant Management"}
                </CardTitle>
                <CardDescription>
                  {activeTab === "hidden"
                    ? "View and manage hidden restaurants"
                    : "View and manage restaurant registrations"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  {/* Search and filter inputs */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search restaurants by name or category..."
                      className="pl-10 pr-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Status and Area filters */}
                  <div className="flex gap-4 items-center">
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {filterOptions.statuses.map((status: any) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={areaFilter}
                      onValueChange={setAreaFilter}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by area" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Areas</SelectItem>
                        {filterOptions.areas.map((area: any) => (
                          <SelectItem key={area.value} value={area.value}>
                            {area.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={resetFilters}
                      title="Reset Filters"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Export button */}
                  <Button
                    onClick={handleExport}
                    disabled={isExporting || filteredRestaurants.length === 0}
                    className="whitespace-nowrap"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine className="mr-2 h-4 w-4" /> Export {activeTab === "hidden" ? "Hidden" : ""}
                      </>
                    )}
                  </Button>
                </div>

                {/* Loading and Empty States */}
                {isFilterLoading ? (
                  <div className="animate-pulse">

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Restaurant</TableHead>
                          <TableHead>Owner Name</TableHead>
                          <TableHead>Cuisine / Category</TableHead>
                          <TableHead>Area</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pin Status</TableHead>
                          <TableHead>Offers</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {[...Array(6)].map((_, i) => (
                          <TableRow key={i} className="animate-pulse">

                            {/* Restaurant */}
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-200 rounded"></div>
                                <div>
                                  <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                                  <div className="h-3 w-20 bg-gray-200 rounded"></div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Owner */}
                            <TableCell>
                              <div className="h-4 w-28 bg-gray-200 rounded"></div>
                            </TableCell>

                            {/* Category */}
                            <TableCell>
                              <div className="h-4 w-32 bg-gray-200 rounded"></div>
                            </TableCell>

                            {/* Area */}
                            <TableCell>
                              <div className="h-4 w-24 bg-gray-200 rounded"></div>
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <div className="h-4 w-16 bg-gray-200 rounded"></div>
                            </TableCell>

                            {/* Pin */}
                            <TableCell>
                              <div className="h-4 w-12 bg-gray-200 rounded"></div>
                            </TableCell>

                            {/* Offers */}
                            <TableCell>
                              <div className="h-4 w-10 bg-gray-200 rounded"></div>
                            </TableCell>

                            {/* Date */}
                            <TableCell>
                              <div className="h-4 w-24 bg-gray-200 rounded"></div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                              </div>
                            </TableCell>

                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                  </div>
                ) : filteredRestaurants.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700">No Restaurants Found</h3>
                    <p className="text-gray-500 mt-2">{emptyStateMessage}</p>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={resetFilters}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <InfiniteScroll
                    dataLength={filteredRestaurants.length}
                    next={() => setPage(prevPage => prevPage + 1)}
                    hasMore={hasMore}
                    loader={
                      <div className="flex justify-center items-center py-4">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
                      </div>
                    }
                    endMessage={
                      filteredRestaurants.length > 0 && (
                        <div className="text-center py-4 text-gray-500">
                          No more restaurants to load
                        </div>
                      )
                    }
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Restaurant</TableHead>
                          <TableHead>Owner Name</TableHead>
                          <TableHead>Cuisine / Category</TableHead>
                          <TableHead>Area</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pin Status</TableHead>
                          <TableHead>Offers</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRestaurants.map((restaurant) => (
                          <RestaurantRow
                            key={restaurant._id}
                            restaurant={restaurant}
                            activeTab={activeTab}
                            hidingId={hidingId}
                            onStatusChange={handleStatusChange}
                            onPinClick={handlePinClick}
                            onHideToggle={handleHideToggle}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </InfiniteScroll>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <>
      {renderLoadingState()}
      <PinRestaurantModal
        restaurant={selectedRestaurantForPin}
        isOpen={pinModalOpen}
        onClose={() => {
          setPinModalOpen(false)
          setSelectedRestaurantForPin(null)
        }}
        onSuccess={handlePinSuccess}
      />
    </>
  )
}
