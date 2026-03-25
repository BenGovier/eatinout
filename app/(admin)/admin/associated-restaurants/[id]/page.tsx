"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "react-toastify"
import { Search, CheckCircle, XCircle, Eye, Edit, ArrowDownToLine, X } from "lucide-react"
import { useParams } from "next/navigation"
import { exportRestaurantsToXLSX } from "@/lib/exportRestaurantsXLSX";

export default function AdminAssociatedRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [areaFilter, setAreaFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [areas, setAreas] = useState<any[]>([])
  const { id } = useParams();

  useEffect(() => {
    document.title = 'Associated Restaurants';
  }, [])

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/admin/restaurants");

        if (!response.ok) {
          throw new Error("Failed to fetch restaurants");
        }

        const data = await response.json();

        if (data.success && data.restaurants) {
          const matchingRestaurant = data?.restaurants?.filter((r: any) => r.associatedId === id || r.userId === id);

          if (matchingRestaurant) {
            setRestaurants(matchingRestaurant); // Set only the matching restaurant
            setFilteredRestaurants(matchingRestaurant); // Set filtered restaurants as well
          } else {
            setRestaurants([]);
            setFilteredRestaurants([]);
            setError("No restaurant found with the provided ID.");
          }
        } else {
          throw new Error(data.message || "Failed to fetch restaurants");
        }
      } catch (err: any) {
        console.error("Error fetching restaurants:", err);
        setError(err.message || "Failed to load restaurants");
        setRestaurants([]);
        setFilteredRestaurants([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurants();
  }, [id]);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const response = await fetch("/api/admin/areas");

        if (!response.ok) {
          throw new Error("Failed to fetch areas");
        }

        const data = await response.json();

        if (data.success && data.areas) {
          // Transform areas into { value, label } format
          const transformedAreas = data.areas.map((area: any) => ({
            value: area._id,
            label: area.name,
          }));
          setAreas(transformedAreas);
        } else {
          throw new Error(data.message || "Failed to fetch areas");
        }
      } catch (err) {
        console.error("Error fetching areas:", err);
        setAreas([]);
      } finally {
        console.log("Areas fetched successfully");
      }
    };

    fetchAreas();
  }, []);

  // Apply filters whenever search term or filters change
  useEffect(() => {
    let results = restaurants

    // Filter by search term
    if (searchTerm) {
      results = results.filter(
        (restaurant) =>
          restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          restaurant.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      results = results.filter((restaurant) => restaurant.status === statusFilter)
    }

    // Filter by area
    if (areaFilter !== "all") {
      results = results.filter((restaurant) => Array.isArray(restaurant.area) && restaurant.area.includes(areaFilter))
    }

    setFilteredRestaurants(results)
  }, [searchTerm, statusFilter, areaFilter, restaurants])

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      // Call API to update status
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
      setRestaurants(
        restaurants.map((restaurant: any) => (restaurant._id === id ? { ...restaurant, status: newStatus } : restaurant)),
      )
      toast.success(`Restaurant status has been updated to ${newStatus}.`)
    } catch (err: any) {
      console.error("Error updating restaurant status:", err)
      toast.error(err.message || "Failed to update restaurant status")
    }
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-6">Manage Restaurants</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Loading restaurants...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 overflow-hidden">
      <h1 className="text-2xl font-bold mb-6">Manage Restaurants</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          <p>{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      )}

      {/* Statistics Cards - Moved from bottom to top */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Restaurants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{restaurants.length}</div>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{restaurants.filter((r) => r.status === "pending").length}</div>
          </CardContent>
        </Card>
        <Card className="w-full sm:col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Restaurants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{restaurants.filter((r) => r.status === "approved").length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Restaurant Management</CardTitle>
          <CardDescription>View and manage restaurant registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search restaurants..."
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
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.value} value={area.value}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() =>
                exportRestaurantsToXLSX(
                  filteredRestaurants,
                  areas.map((area) => ({ value: area.value, label: area.label }))
                )
              }
            >
              <ArrowDownToLine /> Export
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead>Cuisine / Category</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Offers</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRestaurants.length > 0 ? (
                filteredRestaurants.map((restaurant) => (
                  <TableRow key={restaurant._id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{restaurant.name}</div>
                        <div className="text-sm text-gray-500">{restaurant.email}</div>
                      </div>
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
                    </TableCell>                    <TableCell>
                      {restaurant?.area?.map((id: string) => {
                        const area = areas.find((a) => a.value === id)
                        return area ? area.label : ""
                      }).filter((label: string) => label !== "").join(", ")}
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
                      <div className="flex items-center gap-2">
                        <div className="text-base font-semibold bg-gray-50 rounded-full w-7 h-7 flex items-center justify-center">
                          {restaurant.totalOffersCount || 0}
                        </div>
                        {/* <div className="text-xs flex items-center gap-2">
                          <span className="text-green-600 font-medium">{restaurant.activeOffersCount || 0}</span> active
                          <span className="text-yellow-600 font-medium">{restaurant.pendingOffersCount || 0}</span> pending
                        </div> */}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(restaurant.createdAt).toLocaleDateString('en-GB')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/associated-restaurants/${id}/edit/${restaurant._id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/associated-restaurants/${id}/${restaurant._id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>

                        {restaurant.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusChange(restaurant._id, "approved")}
                              className="text-green-600"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusChange(restaurant._id, "rejected")}
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                    No restaurants found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

