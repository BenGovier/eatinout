"use client"

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react"
import InfiniteScroll from "react-infinite-scroll-component"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "react-toastify"
import { Search, Loader2, RefreshCw, X, Download, Clock, CheckCircle2, XCircle, User, Store, Ticket } from "lucide-react"
import * as XLSX from 'xlsx'

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [value, delay])

  return debouncedValue
}

// Memoized Redemption Row Component
const RedemptionRow = memo(({ redemption }: { redemption: any }) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }


  return (
    <TableRow key={redemption._id} className="hover:bg-gray-50/50 transition-colors">
      <TableCell className="py-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900 truncate">{redemption.userName}</div>
            <div className="text-sm text-gray-600 truncate">{redemption.userEmail}</div>
            {redemption.userPhone && redemption.userPhone !== 'N/A' && (
              <div className="text-xs text-gray-500 mt-0.5">{redemption.userPhone}</div>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell className="py-4">
        <div className="flex items-start gap-3">
          {/* <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <Ticket className="h-4 w-4 text-purple-600" />
          </div> */}
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900">{redemption.offerTitle}</div>
            {redemption.isExpired && (
              <div className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded mt-1.5 inline-block border border-gray-200">
                {redemption.offerCode}
              </div>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell className="py-4">
        <div className="flex items-start gap-3">
          {/* <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <Store className="h-4 w-4 text-orange-600" />
          </div> */}
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 truncate">{redemption.restaurantName}</div>
            {redemption.restaurantEmail && redemption.restaurantEmail !== 'N/A' && (
              <div className="text-xs text-gray-600 truncate">{redemption.restaurantEmail}</div>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell className="py-4">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <Clock className="h-4 w-4 text-gray-600" />
          </div>
          <span className="font-medium">{formatDate(redemption.redeemedAt)}</span>
        </div>
      </TableCell>

      <TableCell className="py-4">
        <div className="flex flex-col gap-2">
          {/* Redeemed Status - Always shown */}
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-medium w-fit justify-start">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Redeemed
          </Badge>

          {/* Code Expired Status - Only show when expired */}
          {redemption.isExpired && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-medium w-fit justify-start">
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Code Expired
            </Badge>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
})

RedemptionRow.displayName = 'RedemptionRow'

export default function RedeemedOfferReportPage() {
  const [redemptions, setRedemptions] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [expiredFilter, setExpiredFilter] = useState("all")

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isFilterLoading, setIsFilterLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Statistics
  const [stats, setStats] = useState({
    totalRedeemed: 0,
    expiredCodes: 0,
    activeCodes: 0,
    uniqueUsers: 0,
    uniqueRestaurants: 0
  })

  // Debounced values
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const debouncedExpiredFilter = useDebounce(expiredFilter, 300)

  const fetchRedemptions = useCallback(async () => {
    try {
      setIsFilterLoading(page === 1)

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: debouncedSearchTerm,
        expired: debouncedExpiredFilter
      })

      const response = await fetch(`/api/admin/redeemed-offers?${queryParams}`)

      if (!response.ok) {
        throw new Error("Failed to fetch redeemed offers")
      }

      const data = await response.json()

      if (data.success) {
        setRedemptions(prevRedemptions =>
          page === 1 ? data.redemptions : [...prevRedemptions, ...data.redemptions]
        )

        setStats(data.stats)
        setHasMore(page < data.pagination.pages)
      } else {
        throw new Error(data.message || "Failed to fetch redeemed offers")
      }
    } catch (err: any) {
      console.error("Fetch redeemed offers error:", err)
      setRedemptions([])
      setHasMore(false)
      toast.error(err.message || "Failed to load redeemed offers")
    } finally {
      setIsFilterLoading(false)
      setIsInitialLoading(false)
    }
  }, [page, debouncedSearchTerm, debouncedExpiredFilter])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
    setRedemptions([])
  }, [debouncedSearchTerm, debouncedExpiredFilter])

  // Fetch redemptions
  useEffect(() => {
    document.title = 'Redeemed Offers Report'
    fetchRedemptions()
  }, [fetchRedemptions])

  // Memoized values
  const filteredRedemptions = useMemo(() => redemptions, [redemptions])

  const hasActiveFilters = useMemo(() => {
    return searchTerm !== '' || expiredFilter !== 'all'
  }, [searchTerm, expiredFilter])

  const emptyStateMessage = useMemo(() => {
    if (hasActiveFilters) {
      return "Try adjusting your search or filters"
    }
    return "No redeemed offers found"
  }, [hasActiveFilters])

  const resetFilters = useCallback(() => {
    setSearchTerm('')
    setExpiredFilter('all')
    setPage(1)
  }, [])

  // Export handler
  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true)
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '10000',
        export: 'true',
        search: debouncedSearchTerm,
        expired: debouncedExpiredFilter
      })

      const response = await fetch(`/api/admin/redeemed-offers?${queryParams}`)

      if (!response.ok) {
        throw new Error("Failed to fetch redeemed offers for export")
      }

      const data = await response.json()

      if (data.success) {
        // Prepare data for export
        const exportData = data.redemptions.map((item: any) => ({
          'User Name': item.userName,
          'User Email': item.userEmail,
          'User Phone': item.userPhone,
          'Offer Title': item.offerTitle,
          'Offer Code': item.offerCode,
          'Restaurant Name': item.restaurantName,
          'Restaurant Email': item.restaurantEmail,
          'Restaurant Phone': item.restaurantPhone,
          'Restaurant Address': item.restaurantAddress,
          'Redeemed Date': new Date(item.redeemedAt).toLocaleString('en-GB'),
          'Status': item.isExpired ? 'Expired' : 'Active',
          'Offer Status': item.offerStatus
        }))

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(exportData)

        // Set column widths
        ws['!cols'] = [
          { wch: 20 }, // User Name
          { wch: 30 }, // User Email
          { wch: 15 }, // User Phone
          { wch: 30 }, // Offer Title
          { wch: 15 }, // Offer Code
          { wch: 25 }, // Restaurant Name
          { wch: 30 }, // Restaurant Email
          { wch: 15 }, // Restaurant Phone
          { wch: 40 }, // Restaurant Address
          { wch: 20 }, // Redeemed Date
          { wch: 10 }, // Status
          { wch: 12 }  // Offer Status
        ]

        XLSX.utils.book_append_sheet(wb, ws, 'Redeemed Offers')

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0]
        const filename = `redeemed-offers-${timestamp}.xlsx`

        // Download file
        XLSX.writeFile(wb, filename)

        // toast.success(`Exported ${exportData.length} redeemed offers successfully!`)
      } else {
        toast.error("Failed to export redeemed offers")
      }
    } catch (error) {
      console.error("Export error:", error)
      toast.error("An error occurred while exporting redeemed offers")
    } finally {
      setIsExporting(false)
    }
  }, [debouncedSearchTerm, debouncedExpiredFilter])

  // if (isInitialLoading) {
  //   return (
  //     <div className="py-8">
  //       <h1 className="text-2xl font-bold mb-6">Redeemed Offers Report</h1>
  //       <div className="flex justify-center items-center h-64">
  //         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  //         <span className="ml-2">Loading redeemed offers...</span>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className="py-8 overflow-hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Redeemed Offers Report</h1>
        <p className="text-gray-500 text-sm mt-1">Track and manage all redeemed offers across your platform</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Redeemed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalRedeemed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Valid Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeCodes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Expired Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expiredCodes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.uniqueUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Restaurants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.uniqueRestaurants}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Redemption Records</CardTitle>
          <CardDescription>
            View detailed information about all redeemed offers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name, email, or offer code..."
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

            {/* Filters */}
            <div className="flex gap-4 items-center">
              <Select
                value={expiredFilter}
                onValueChange={setExpiredFilter}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by code status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Codes</SelectItem>
                  <SelectItem value="active">Valid Codes Only</SelectItem>
                  <SelectItem value="expired">Expired Codes Only</SelectItem>
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

            {/* Export Button */}
            <Button
              onClick={handleExport}
              disabled={isExporting || filteredRedemptions.length === 0}
              className="whitespace-nowrap"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" /> Export
                </>
              )}
            </Button>
          </div>

          {/* Loading and Empty States */}
          {isFilterLoading ? (
            <div className="space-y-4 animate-pulse">

              {/* Table Skeleton */}
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-5 gap-4 p-4 border rounded-lg"
                >
                  {/* User */}
                  <div>
                    <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 w-24 bg-gray-200 rounded"></div>
                  </div>

                  {/* Offer */}
                  <div>
                    <div className="h-4 w-28 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 w-20 bg-gray-200 rounded"></div>
                  </div>

                  {/* Restaurant */}
                  <div>
                    <div className="h-4 w-36 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 w-24 bg-gray-200 rounded"></div>
                  </div>

                  {/* Date */}
                  <div>
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  </div>

                  {/* Status */}
                  <div>
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}

            </div>
          ) : filteredRedemptions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Ticket className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700">No Redemptions Found</h3>
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
              dataLength={filteredRedemptions.length}
              next={() => setPage(prevPage => prevPage + 1)}
              hasMore={hasMore}
              loader={
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
                </div>
              }
              endMessage={
                filteredRedemptions.length > 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No more records to load
                  </div>
                )
              }
            >
              <div className="rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
                <div className="min-w-[1000px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                        <TableHead className="font-semibold text-gray-700 py-4 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            User Details
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <Ticket className="h-4 w-4" />
                            Offer Details
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4 min-w-[250px]">
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4" />
                            Restaurant
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4 min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Redeemed Date
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4 min-w-[170px]">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Status
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100">
                      {filteredRedemptions.map((redemption) => (
                        <RedemptionRow
                          key={redemption._id}
                          redemption={redemption}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </InfiniteScroll>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

