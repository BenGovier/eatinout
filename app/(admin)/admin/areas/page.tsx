"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-toastify"
import { Plus, Edit, Trash2, Check, X, AlertTriangle, Loader2, Search } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import InfiniteScroll from "react-infinite-scroll-component"

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

export default function AdminAreasPage() {
  const [areas, setAreas] = useState<any[]>([])
  const [filteredAreas, setFilteredAreas] = useState<any[]>([])
  const [newArea, setNewArea] = useState("")
  const [editingArea, setEditingArea] = useState<{ _id: string; name: string; isActive: boolean; hideRestaurant: boolean } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Dynamic filter options
  const [filterOptions, setFilterOptions] = useState({
    statuses: []
  })

  // Global statistics
  const [stats, setStats] = useState({
    totalAreas: 0,
    activeAreas: 0,
    inactiveAreas: 0,
    totalRestaurants: 0
  })

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const debouncedStatusFilter = useDebounce(statusFilter, 300)

  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isToggling, setIsToggling] = useState<string | null>(null)
  const [isHideToggling, setIsHideToggling] = useState<string | null>(null)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorModalMessage, setErrorModalMessage] = useState("")

  useEffect(() => {
    document.title = 'Areas';
  }, []);

  const fetchAreas = useCallback(async () => {
    try {
      setIsLoading(true)
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: debouncedSearchTerm,
        status: debouncedStatusFilter
      })

      const response = await fetch(`/api/admin/areas?${queryParams}`)

      if (!response.ok) {
        throw new Error("Failed to fetch areas")
      }

      const data = await response.json()

      if (data.success) {
        setAreas(prevAreas =>
          page === 1 ? data.areas : [...prevAreas, ...data.areas]
        )
        setFilterOptions(data.filters)
        setStats(data.stats)
        setHasMore(page < data.pagination.pages)
      } else {
        throw new Error(data.message || "Failed to fetch areas")
      }
    } catch (err: any) {
      console.error("Error fetching areas:", err)
      setAreas([])
      setHasMore(false)
      toast.error(err.message || "Failed to fetch areas")
    } finally {
      setIsLoading(false)
      setIsInitialLoading(false)
    }
  }, [page, debouncedSearchTerm, debouncedStatusFilter])

  // Fetch areas when page, search, or filters change
  useEffect(() => {
    fetchAreas()
  }, [page, debouncedSearchTerm, debouncedStatusFilter, fetchAreas])

  // Apply local filtering for immediate UI feedback
  const applyLocalFilters = useCallback(() => {
    let results = areas

    // Filter by search term
    if (searchTerm) {
      const lowercaseTerm = searchTerm.toLowerCase()
      results = results.filter(
        (area) => area.name.toLowerCase().includes(lowercaseTerm)
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      results = results.filter((area) =>
        statusFilter === 'active' ? area.isActive : !area.isActive
      )
    }

    setFilteredAreas(results)
  }, [areas, searchTerm, statusFilter])

  // Apply local filters whenever source data or filters change
  useEffect(() => {
    applyLocalFilters()
  }, [applyLocalFilters])

  const handleAddArea = async () => {
    if (!newArea.trim()) {
      toast.error("Area name is required")
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/admin/areas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newArea }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to add area")
      }

      // Add new area to state
      setAreas([data.area, ...areas])
      setNewArea("")
      toast.success("Area added successfully")

    } catch (err: any) {
      console.error("Error adding area:", err.message)
      toast.error(err.message || "Failed to add area")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditArea = (area: { _id: string; name: string; isActive: boolean; hideRestaurant: boolean }) => {
    setEditingArea({
      _id: area._id,
      name: area.name,
      isActive: area.isActive,
      hideRestaurant: area.hideRestaurant,
    })
  }

  const handleUpdateArea = async () => {
    if (!editingArea || !editingArea.name.trim()) {
      toast.error("Area name is required")
      return
    }

    try {
      setIsEditing(true)
      const response = await fetch(`/api/admin/areas/${editingArea._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editingArea.name,
          isActive: editingArea.isActive,
          hideRestaurant: editingArea.hideRestaurant,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to update area")
      }

      // Update area in state
      setAreas(
        areas.map((area: any) =>
          area._id === editingArea._id
            ? {
              ...area,
              name: data.area.name,
              isActive: data.area.isActive,
              hideRestaurant: data.area.hideRestaurant,
            }
            : area,
        ),
      )

      setEditingArea(null)

      toast.success("Area updated successfully")
    } catch (err: any) {
      console.error("Error updating area:", err.message)
      toast.error(err.message || "Failed to update area")
    } finally {
      setIsEditing(false)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setIsToggling(id)
      const response = await fetch(`/api/admin/areas/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: areas.find((area: any) => area._id === id).name,
          isActive: !currentStatus,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to update area status")
      }

      // Update area in state
      setAreas(
        areas.map((area: any) =>
          area._id === id
            ? {
              ...area,
              isActive: !currentStatus,
            }
            : area,
        ),
      )

      toast.success(`Area ${!currentStatus ? "activated" : "deactivated"} successfully`)
    } catch (err: any) {
      console.error("Error updating area status:", err)
      toast.error(err.message || "Failed to update area status")
    } finally {
      setIsToggling(null)
    }
  }

  const handleToggleHide = async (id: string, currentStatus: boolean) => {
    try {
      setIsHideToggling(id)
      const response = await fetch(`/api/admin/areas/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: areas.find((area: any) => area._id === id).name,
          hideRestaurant: !currentStatus,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to update area hide")
      }

      // Update area in state
      setAreas(
        areas.map((area: any) =>
          area._id === id
            ? {
              ...area,
              hideRestaurant: !currentStatus,
            }
            : area,
        ),
      )

      toast.success(`All restaurants associated with this area are now ${currentStatus ? "visible" : "hidden"}.`);
    } catch (err: any) {
      console.error("Error updating area hide:", err)
      toast.error(err.message || "Failed to update area hide")
    } finally {
      setIsHideToggling(null)
    }
  }

  const handleDeleteArea = async (id: string) => {
    // Confirm deletion
    if (!window.confirm("Are you sure you want to delete this area? This action cannot be undone.")) {
      return
    }

    try {
      setIsDeleting(id)
      const response = await fetch(`/api/admin/areas/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if it's the area assignment error and show modal
        if (response.status === 400 && data.message?.includes("because it is assigned to")) {
          setErrorModalMessage(data.message)
          setShowErrorModal(true)
        } else {
          toast.error(data.message || "Failed to delete area")
        }
        return
      }

      // Remove area from state
      setAreas(areas.filter((area: { _id: string }) => area._id !== id))

      toast.success("Area deleted successfully")
    } catch (err: any) {
      console.error("Error deleting area:", err)
      toast.error(err.message || "Failed to delete area")
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Areas</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalAreas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeAreas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Inactive Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.inactiveAreas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Restaurants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalRestaurants}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add New Area</CardTitle>
            <CardDescription>Add a new area for restaurants to select during registration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="newArea">Area Name</Label>
              <div className="flex space-x-2">
                <Input
                  id="newArea"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  placeholder="Enter area name"
                  disabled={isSubmitting}
                />
                <Button onClick={handleAddArea} disabled={isSubmitting || !newArea.trim()}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {editingArea && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Area</CardTitle>
              <CardDescription>Update the selected area name</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="editArea">Area Name</Label>
                <div className="flex space-x-2">
                  <Input
                    id="editArea"
                    value={editingArea.name}
                    onChange={(e) => setEditingArea({ ...editingArea, name: e.target.value })}
                    placeholder="Enter area name"
                    disabled={isSubmitting}
                  />
                  <Button onClick={handleUpdateArea} disabled={isSubmitting || !editingArea.name.trim()}>
                    {isEditing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update"
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  id="hideRestaurant"
                  checked={editingArea.hideRestaurant}
                  onChange={() => setEditingArea({ ...editingArea, hideRestaurant: !editingArea.hideRestaurant })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="hideRestaurant" className="text-sm font-medium">
                  Hide Restaurants from public
                </Label>
              </div>

              <div className="flex items-center space-x-2 mt-4">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingArea.isActive}
                  onChange={() => setEditingArea({ ...editingArea, isActive: !editingArea.isActive })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="isActive" className="text-sm font-medium">
                  Active
                </Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => setEditingArea(null)}>
                Cancel
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Current Areas</CardTitle>
          <CardDescription>List of all available areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search areas..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
          </div>

          {isLoading && page === 1 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area Name</TableHead>
                  <TableHead>Restaurants</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hide</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {[...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    {/* Area Name */}
                    <TableCell>
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    </TableCell>

                    {/* Restaurants */}
                    <TableCell>
                      <div className="h-4 w-10 bg-gray-200 rounded animate-pulse" />
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                    </TableCell>

                    {/* Hide */}
                    <TableCell>
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3">
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : filteredAreas.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700">No Areas Found</h3>
              <p className="text-gray-500 mt-2">
                {searchTerm || statusFilter !== 'all'
                  ? "Try adjusting your search or filters"
                  : "No areas have been added yet"}
              </p>
              {(searchTerm || statusFilter !== 'all') && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <InfiniteScroll
              dataLength={filteredAreas.length}
              next={() => setPage(prevPage => prevPage + 1)}
              hasMore={hasMore}
              loader={
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
                </div>
              }
              endMessage={
                filteredAreas.length > 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No more areas to load
                  </div>
                )
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Area Name</TableHead>
                    <TableHead>Restaurants</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hide</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAreas.map((area) => (
                    <TableRow key={area._id}>
                      <TableCell className="font-medium">{area.name}</TableCell>
                      <TableCell>{area.restaurantCount}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            area.isActive
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }
                        >
                          {area.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex gap-1">
                                <input
                                  type="checkbox"
                                  checked={area.hideRestaurant}
                                  onChange={() => handleToggleHide(area._id, area.hideRestaurant)}
                                  disabled={isHideToggling === area._id}
                                  className="h-4 w-4 cursor-pointer accent-red-600"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {area.hideRestaurant ? "Unhide Restaurant" : "Hide Restaurant"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(area._id, area.isActive)}
                          disabled={isToggling === area._id}
                        >
                          {isToggling === area._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : area.isActive ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <X className="h-4 w-4 text-red-600" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Deactivate
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Check className="h-4 w-4 text-green-600" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Activate
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditArea(area)}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Edit className="h-4 w-4" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Edit
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteArea(area._id)}
                          disabled={isDeleting === area._id}
                        >
                          {isDeleting === area._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Trash2 className="h-4 w-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Delete
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </InfiniteScroll>
          )}
        </CardContent>
      </Card>

      {/* Error Modal for Area Deletion Restrictions */}
      <AlertDialog open={showErrorModal} onOpenChange={() => setShowErrorModal(false)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <AlertDialogTitle>Cannot Delete Area</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-gray-600 mt-2">
              {errorModalMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowErrorModal(false)}
              className="bg-primary hover:bg-primary/90"
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

