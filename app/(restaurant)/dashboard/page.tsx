"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { BarChart, PlusCircle, Tag, Users } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

// Types for dashboard data
interface DashboardData {
  activeOffers: number
  totalRedemptions: number
  monthlyRedemptions: number
  recentActivity: {
    id: string
    redeemCode: string
    offerTitle: string
    offerStatus: string
    userName: string
    userEmail: string
    redeemedAt: string
  }[]
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    activeOffers: 0,
    totalRedemptions: 0,
    monthlyRedemptions: 0,
    recentActivity: [],
  })
  useEffect(() => {
    document.title = "Dashboard"
  }, [])
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/restaurant/dashboard")

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data")
        }

        const data = await response.json()
        setDashboardData(data)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Restaurant Dashboard</h1>
        {/* <Button asChild>
          <Link href="/dashboard/offers/create">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Offer
          </Link>
        </Button> */}
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="h-8 bg-gray-200 rounded w-12"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Active Offers Card */}
          <Link href="/dashboard/offers" className="block">
            <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-red-200 h-full group">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Active Offers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{dashboardData.activeOffers}</div>
                  <Tag className="h-8 w-8 text-red-600" />
                </div>
                {/* View All Button */}
                <Link href="/dashboard/offers" className="mt-3 inline-block text-xs text-gray-400 hover:text-red-600">
                  View All
                </Link>
              </CardContent>
            </Card>
          </Link>

          {/* Total Redemptions Card */}
          <Link href="/dashboard/allredemption" className="block">
            <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-red-200 h-full group">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Redemptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{dashboardData.totalRedemptions}</div>
                  <Users className="h-8 w-8 text-red-600" />
                </div>
                {/* View All Button */}
                <Link href="/dashboard/allredemption" className="mt-3 inline-block text-xs text-gray-400 hover:text-red-600">
                  View All
                </Link>
              </CardContent>
            </Card>
          </Link>

          {/* This Month Card */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-red-200 h-full group">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{dashboardData.monthlyRedemptions}</div>
                <BarChart className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest offer redemptions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : dashboardData.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-base">
                      {activity.offerTitle}{" "}
                      <span
                        className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold 
                       ${activity.offerStatus === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"}`}
                      >
                        {activity.offerStatus}
                      </span>
                    </p>

                    <p className="text-sm text-gray-600 mt-3">
                      Redeemed by <span className="font-semibold text-black">{activity.userName}</span>{" "}
                      {/* <span className="text-gray-500">({activity.userEmail})</span> */}
                    </p>
                    <p className="text-sm mt-1">
                      Redeem  Code:{" "}
                      <span className="inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-mono font-semibold">
                        {activity.redeemCode}
                      </span>
                    </p>

                  </div>

                  <p className="text-sm text-gray-500 whitespace-nowrap">
                    {formatTimeAgo(new Date(activity.redeemedAt))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No recent redemptions yet.</p>
              <p className="text-sm mt-2">Create offers to attract customers!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "just now"

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`
}
