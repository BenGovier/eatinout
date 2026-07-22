"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search } from "lucide-react"
import InfiniteScroll from "react-infinite-scroll-component"
import { toast } from "react-toastify"

interface Lead {
  _id: string
  firstName: string
  lastName: string
  email: string
  mobile: string
  converted: boolean
  createdAt: string
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [stats, setStats] = useState({
    totalUnconvertedLeads: 0,
  })

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true)
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      const response = await fetch(`/api/admin/leads?${queryParams}`)

      if (!response.ok) {
        throw new Error("Failed to fetch leads")
      }

      const data = await response.json()

      if (data.success) {
        setLeads(prevLeads =>
          page === 1 ? data.leads : [...prevLeads, ...data.leads]
        )
        setStats(data.stats)
        setHasMore(page < data.pagination.pages)
      } else {
        throw new Error(data.message || "Failed to fetch leads")
      }
    } catch (err: any) {
      console.error("Error fetching leads:", err)
      if (page === 1) {
        setLeads([])
        setHasMore(false)
      }
      toast.error(err.message || "Failed to fetch leads")
    } finally {
      setIsLoading(false)
      setIsInitialLoading(false)
    }
  }, [page])

  useEffect(() => {
    document.title = 'Leads'
    fetchLeads()
  }, [fetchLeads])

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB')
    } catch (error) {
      return "Invalid date"
    }
  }

  // if (isInitialLoading) {
  //   return (
  //     <div className="py-8">
  //       <h1 className="text-2xl font-bold mb-6">Manage Leads</h1>
  //       <div className="flex justify-center items-center h-64">
  //         <Loader2 className="animate-spin h-8 w-8 text-gray-500" />
  //         <span className="ml-2 text-gray-500">Loading leads...</span>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Leads</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Abandoned Sign-ups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUnconvertedLeads}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads List</CardTitle>
          <CardDescription>View users who started sign-up but did not complete it</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && page === 1 ? (
            <div className="animate-pulse">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(6)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="h-4 w-40 bg-gray-200 rounded"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-5 w-24 bg-gray-200 rounded-full"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700">No Leads Found</h3>
              <p className="text-gray-500 mt-2">
                No users have started the sign-up process yet
              </p>
            </div>
          ) : (
            <InfiniteScroll
              dataLength={leads.length}
              next={loadMore}
              hasMore={hasMore}
              loader={
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
                </div>
              }
              endMessage={
                leads.length > 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No more leads to load
                  </div>
                )
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead._id}>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-yellow-200"
                        >
                          Incomplete
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(lead.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </InfiniteScroll>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
