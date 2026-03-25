"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Search } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface DashboardData {
  recentActivity: {
    id: string
    redeemCode: string
    offerTitle: string
    offerStatus: string
    userName: string
    userEmail: string
    redeemedAt: string
    redeemStatus: boolean
    redeemCodeExpiry: string | any
  }[]
}

export default function AllRedemptionPage() {
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    recentActivity: [],
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    document.title = "All Redemption"
  }, [])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/restaurant/allredemption")
        if (!response.ok) throw new Error("Failed to fetch dashboard data")
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

  const filteredRedemptions = dashboardData.recentActivity.filter((activity) => {
    const matchesSearch =
      activity.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.userEmail.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      statusFilter === "all" ||
      activity.offerStatus.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader>
        <CardTitle>Offer Redemptions</CardTitle>
        <CardDescription>View and filter customer offer redemptions</CardDescription>
      </CardHeader>

      <CardContent>
        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by customer name or email..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-full md:w-[200px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Scrollable Table Wrapper */}
        <div className="w-full overflow-x-auto">
          <table className="min-w-[700px] w-full">
            <thead>
              <tr>
                <th className="text-left py-2 px-4">Offer</th>
                <th className="text-left py-2 px-4">Status</th>
                <th className="text-left py-2 px-4">Redeem Code</th>
                <th className="text-left py-2 px-4">Customer</th>
                {/* <th className="text-left py-2 px-4">Email</th> */}
                <th className="text-left py-2 px-4">Redeemed</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={6} className="text-center py-6">
                      <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredRedemptions.length > 0 ? (
                filteredRedemptions.map((activity) => (
                  console.log(activity),
                  <tr key={activity.id}>
                    <td className="py-2 px-4 text-sm">{activity.offerTitle}</td>
                    <td className="py-2 px-4">
                      <Badge
                        variant="outline"
                        className={
                          activity.offerStatus.toLowerCase() === "active"
                            ? "bg-green-50 text-green-700 border-green-200 "
                            : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {activity.offerStatus}
                      </Badge>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono  bg-gray-100 px-2 py-0.5 rounded text-xs w-fit">
                          {activity.redeemCode} {activity.redeemCodeExpiry && Date.now() > activity.redeemCodeExpiry && (
                            <span className="text-xs text-red-600 font-medium">Expired</span>
                          )}
                        </span>
                      </div>
                    </td>


                    <td className="py-2 px-4 text-sm">{activity.userName}</td>
                    {/* <td className="py-2 px-4 text-sm">{activity.userEmail}</td> */}
                    <td className="py-2 px-4 text-sm text-gray-500">
                      {formatTimeAgo(new Date(activity.redeemedAt))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-500">
                    No redemptions match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );


}

// Helper function to format "time ago"
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
