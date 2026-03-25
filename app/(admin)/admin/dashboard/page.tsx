"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Store, Tag, MapPin, ChevronRight } from "lucide-react"
import Link from "next/link"

interface User {
  _id: string
  firstName: string
  lastName: string
  email: string
  createdAt: string
}

interface Restaurant {
  _id: string
  name: string
  area: { name: string }[] // Change area to be an array of area objects
  createdAt: string
}

interface DashboardStats {
  userCount: number
  restaurantCount: number
  activeOffersCount: number
  areasCount: number
  recentSignups: User[]
  newRestaurants: Restaurant[]
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    userCount: 0,
    restaurantCount: 0,
    activeOffersCount: 0,
    areasCount: 0,
    recentSignups: [],
    newRestaurants: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    document.title = 'Dashboard'
  }, [])

  // Fetch the dashboard statistics
  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        setIsLoading(true)
        const response = await fetch("/api/admin/dashboard")

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard statistics")
        }

        const data = await response.json()

        if (data.success) {
          setStats(data.stats)
        } else {
          throw new Error(data.message || "Failed to fetch dashboard data")
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error)
        setError(error instanceof Error ? error.message : "An error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardStats()
  }, [])

  // Format date for display
  const formatTimeAgo = (date: string): string => {
    const now = new Date()
    const createdDate = new Date(date)
    const diffMs = now.getTime() - createdDate.getTime()

    // Calculate different time periods
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) {
      return "Just now"
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    } else if (diffDays === 1) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      // For items older than a week, show the actual date
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }
      return createdDate.toLocaleDateString(undefined, options)
    }
  }

  // Function to get area names from area objects
  const getAreaNames = (areas: { name: string }[]): string => {
    return areas
      .map((area) => area.name)
      .join(", ")
  }

  // if (isLoading) {
  //   return (
  //     <div className="flex justify-center items-center min-h-[50vh]">
  //       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
  //       <span className="ml-2">Loading dashboard data...</span>
  //     </div>
  //   )
  // }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/users" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-red-200 h-full group">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.userCount.toLocaleString() || 0}</div>
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-red-600" />
                  <span className="ml-1 text-xs text-gray-400 group-hover:text-red-600">View all</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/restaurants" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-red-200 h-full group">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Restaurants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.restaurantCount.toLocaleString() || 0}</div>
                <div className="flex items-center">
                  <Store className="h-8 w-8 text-red-600" />
                  <span className="ml-1 text-xs text-gray-400 group-hover:text-red-600">View all</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/deals" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-red-200 h-full group">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Active Deals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.activeOffersCount.toLocaleString() || 0}</div>
                <div className="flex items-center">
                  <Tag className="h-8 w-8 text-red-600" />
                  <span className="ml-1 text-xs text-gray-400 group-hover:text-red-600">View all</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/areas" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-red-200 h-full group">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.areasCount || 0}</div>
                <div className="flex items-center">
                  <MapPin className="h-8 w-8 text-red-600" />
                  <span className="ml-1 text-xs text-gray-400 group-hover:text-red-600">View all</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 mt-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Signups</CardTitle>
            <CardDescription>New users in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b animate-pulse">
                    <div>
                      <div className="h-4 w-32 bg-gray-200 rounded mb-1"></div>
                      <div className="h-3 w-40 bg-gray-100 rounded"></div>
                    </div>
                    <div className="h-3 w-16 bg-gray-200 rounded"></div>
                  </div>
                ))
              ) : stats.recentSignups.length > 0 ? (
                stats.recentSignups.map((user) => (
                  <Link
                    href={`/admin/users/${user._id}`}
                    key={user._id}
                    className="block hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 p-2 group">
                      <div>
                        <p className="font-medium group-hover:text-red-600 transition-colors">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <span>{formatTimeAgo(user.createdAt)}</span>
                        <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 text-red-600 transition-opacity" />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">No recent signups</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New Restaurants</CardTitle>
            <CardDescription>Recently registered restaurants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b animate-pulse">
                    <div>
                      <div className="h-4 w-36 bg-gray-200 rounded mb-1"></div>
                      <div className="h-3 w-32 bg-gray-100 rounded"></div>
                    </div>
                    <div className="h-3 w-16 bg-gray-200 rounded"></div>
                  </div>
                ))
              ) : stats.newRestaurants.length > 0 ? (
                stats.newRestaurants.map((restaurant) => (
                  <Link
                    href={`/admin/restaurants/${restaurant._id}`}
                    key={restaurant._id}
                    className="block hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 p-2 group">
                      <div>
                        <p className="font-medium group-hover:text-red-600 transition-colors">
                          {restaurant.name}
                        </p>
                        <p className="text-sm text-gray-500">{getAreaNames(restaurant.area)}</p>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <span>{formatTimeAgo(restaurant.createdAt)}</span>
                        <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 text-red-600 transition-opacity" />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">No new restaurants</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
