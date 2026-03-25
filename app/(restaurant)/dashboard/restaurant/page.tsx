"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Edit, Plus, ChevronRight, PlusCircle, ArrowDownToLine } from "lucide-react"
import { toast } from "react-toastify"
import { useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { exportRestaurantsToXLSX } from "@/lib/exportRestaurantsXLSX"

interface RestaurantData {
  _id: string
  name: string
  description: string
  cuisine: string
  // area: string[] 
  area: { id: string; name: string }[]
  status: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  website: string
  openingHours: {
    [key: string]: string
  }
  images: string[]
  dineIn: boolean
  dineOut: boolean
  deliveryAvailable: boolean
  createdAt: string
  totalOffersCount?: number
  activeOffersCount?: number
  pendingOffersCount?: number
  category?: {
    id: string
    name: string
  }[]
}

// interface Area {
//   _id: string
//   name: string
// }

export default function RestaurantPage() {
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([])
  // const [areas, setAreas] = useState<Area[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [, setError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
  });
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    document.title = "Restaurants"
  }, [])

  // Fetch the restaurant data
  const fetchRestaurantData = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) setIsLoading(true);
      else setLoadingMore(true);

      const response = await fetch(`/api/restaurant?page=${page}&limit=10`);
      if (!response.ok) throw new Error("Failed to fetch restaurant data");

      const result = await response.json();

      if (append) {
        setRestaurants((prev) => [...prev, ...result.data]);
      } else {
        setRestaurants(result.data);
      }

      setPagination({
        currentPage: result.pagination?.currentPage || page,
        totalPages: result.pagination?.totalPages || 1,
        hasNextPage: (result.pagination?.currentPage || page) < (result.pagination?.totalPages || 1),
      });
    } catch (err: any) {
      console.error("Error fetching restaurant data:", err);
      setError(err.message || "Failed to load restaurant data");
      toast.error("Failed to load restaurant data");
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchRestaurantData(); // initial fetch page 1
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 200 &&
        pagination.hasNextPage &&
        !loadingMore &&
        !isLoading
      ) {
        fetchRestaurantData(pagination.currentPage + 1, true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pagination.hasNextPage, loadingMore, isLoading, pagination.currentPage]);

  const handleExport = async () => {
    try {
      const response = await fetch("/api/restaurant/export");
      if (!response.ok) {
        throw new Error("Failed to fetch restaurant data for export");
      }
      const result = await response.json();
      // Pass false to show owner name (second parameter is hideOwnerName)
      exportRestaurantsToXLSX(result.data, false);
      // toast.success("Restaurants exported successfully!");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Failed to export restaurants");
    }
  };


  // const getAreaNames = (areaIds: string[]): string => {
  //   const names = areaIds.map(id => areas.find(a => a._id === id)?.name || id);
  //   return names.join(", ");
  // };

  const getAreaNames = (areas: { id: string; name: string }[]): string =>
    areas.map((a) => a.name).join(", ")

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this restaurant?")) return;

    setDeletingId(id); // Set the ID of the restaurant being deleted
    try {
      const response = await fetch(`/api/restaurant/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Delete error:", errorData);
        throw new Error(errorData.message || "Failed to delete restaurant");
      }

      toast.success("Restaurant deleted successfully!");
      setRestaurants((prev) => prev.filter((restaurant) => restaurant._id !== id)); // Remove the deleted restaurant from the list
    } catch (err: any) {
      console.error("Error deleting restaurant:", err);
      toast.error(err.message || "Failed to delete restaurant. Please try again.");
    } finally {
      setDeletingId(null); // Reset the deleting state
    }
  };

  // if (isLoading) {
  //   return (
  //     <div className="container py-8">
  //       <div className="flex justify-center items-center h-64">
  //         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  //         <span className="ml-2">Loading restaurant data...</span>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-3 justify-between">
        <h1 className="text-2xl font-bold">Manage Restaurants</h1>
        <div className="flex gap-3">
           <Button asChild>
            <span
              onClick={() => {
                const unassociatedRestaurant = restaurants?.find(
                  (r: any) => !r.associatedId
                );
                if (unassociatedRestaurant?.status === "pending") {
                  toast.info("Your account is under review. You can add a new restaurant once it is approved.");
                } else {
                  router.push("/dashboard/restaurant/create");
                }
              }}
              className="flex items-center cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Restaurant
            </span>
          </Button>
        </div>
      </div>

      {/* Restaurant Details Card */}
      <Card className="mb-6 mt-3 overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Restaurants</CardTitle>
              <CardDescription>Your restaurant's details and current status.</CardDescription>
            </div>
            <Button
             onClick={handleExport}
            >
              <ArrowDownToLine /> Export
            </Button>

          </div>
        </CardHeader>
        <CardContent>
          <Table className="overflow-scroll">
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead>Cuisine</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index} className="animate-pulse">
                    <TableCell>
                      <div className="h-4 bg-gray-300 rounded w-32"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-300 rounded w-24"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-300 rounded w-28"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-300 rounded w-20"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-300 rounded w-16"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : restaurants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                    No associated restaurant added so far
                  </TableCell>
                </TableRow>
              ) : (
                restaurants.map((restaurant: any) => (
                  <TableRow
                    key={restaurant._id}
                    className="cursor-pointer hover:bg-gray-50 group transition-colors"
                    onClick={() => router.push(`/dashboard/restaurant/${restaurant._id}`)}
                  >
                    <TableCell className="font-medium">
                      <div>
                        <div className="group-hover:text-red-600 transition-colors">{restaurant.name}</div>
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
                    </TableCell>
                    <TableCell>{getAreaNames(restaurant.area)}</TableCell>
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
                        {restaurant.status ? restaurant.status.charAt(0).toUpperCase() + restaurant.status.slice(1) : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/restaurant/edit/${restaurant._id}`}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Edit className="h-4 w-4" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                          onClick={() => handleDelete(restaurant._id)}
                          disabled={deletingId === restaurant._id}
                        >
                          {deletingId === restaurant._id ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                            </div>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </Button>
                        <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 text-red-600 transition-opacity" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {loadingMore && (
            <div className="text-center py-4">
              <div className="flex justify-center items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                <span>Loading more restaurants...</span>
              </div>
            </div>
          )}
        </CardContent>

      </Card>
    </div>
  )
}
