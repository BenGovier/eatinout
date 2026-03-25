"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, ArrowDownToLine, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { exportUsersToXLSX } from "@/lib/export-users";
import InfiniteScroll from "react-infinite-scroll-component"
import { toast } from "react-toastify"

// Define user type
interface User {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: string
  subscriptionStatus: string
  createdAt: string
  restaurantName?: string
  zipCode?: string
}

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [subscriptionFilter, setSubscriptionFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  // Dynamic filter options
  const [filterOptions, setFilterOptions] = useState({
    roles: [],
    subscriptionStatuses: []
  })

  // Global statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscribers: 0,
    restaurantOwners: 0,
    adminUsers: 0
  })

  // Debounce search and filters
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const debouncedRoleFilter = useDebounce(roleFilter, 300)
  const debouncedSubscriptionFilter = useDebounce(subscriptionFilter, 300)

  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [deleteUserName, setDeleteUserName] = useState<string>('')
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState<string>('')
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: debouncedSearchTerm,
        role: debouncedRoleFilter,
        subscription: debouncedSubscriptionFilter
      })

      const response = await fetch(`/api/admin/users?${queryParams}`)

      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }

      const data = await response.json()

      if (data.success) {
        setUsers(prevUsers =>
          page === 1 ? data.users : [...prevUsers, ...data.users]
        )
        setFilterOptions(data.filters)
        setStats(data.stats)
        setHasMore(page < data.pagination.pages)
      } else {
        throw new Error(data.message || "Failed to fetch users")
      }
    } catch (err: any) {
      console.error("Error fetching users:", err)
      setUsers([])
      setHasMore(false)
      toast.error(err.message || "Failed to fetch users")
    } finally {
      setIsLoading(false)
      setIsInitialLoading(false)
    }
  }, [page, debouncedSearchTerm, debouncedRoleFilter, debouncedSubscriptionFilter])

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1)
    setUsers([]) // Clear users array when filters change
  }, [debouncedSearchTerm, debouncedRoleFilter, debouncedSubscriptionFilter])

  // Fetch users when page, search, or filters change
  useEffect(() => {
    document.title = 'Users'
    fetchUsers()
  }, [fetchUsers])

  // Set filtered users to be the same as users (since API already filters)
  useEffect(() => {
    setFilteredUsers(users)
  }, [users])

  const handleDeleteConfirm = async () => {
    if (!deleteUserId) return

    // Check if confirmation input matches restaurant name for restaurant users
    const userToDelete = users.find(user => user._id === deleteUserId)
    if (userToDelete?.role === 'restaurant' && deleteConfirmationInput !== userToDelete.restaurantName) {
      toast.error('Restaurant name does not match. Please type the exact restaurant name.')
      return
    }

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/admin/users/${deleteUserId}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (data.success) {
        setUsers((prev) => prev.filter((user) => user._id !== deleteUserId))
        setFilteredUsers((prev) => prev.filter((user) => user._id !== deleteUserId))
        setDeleteUserId(null)
        setDeleteUserName('')
        setDeleteConfirmationInput('')
        toast.success("User deleted successfully!")
      } else {
        toast.error(data.message || "Failed to delete user")
      }
    } catch (error) {
      console.error(error)
      toast.error("Something went wrong while deleting")
    } finally {
      setIsDeleting(false)
    }
  }

  // if (isInitialLoading) {
  //   return (
  //     <div className="py-8">
  //       <h1 className="text-2xl font-bold mb-6">Manage Users</h1>
  //       <div className="flex justify-center items-center h-64">
  //         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  //         <span className="ml-2">Loading users...</span>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Users</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeSubscribers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Restaurant Owners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.restaurantOwners}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.adminUsers}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>View and manage user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search users..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {filterOptions.roles.map((role: any) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by subscription" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {filterOptions.subscriptionStatuses.map((status: any) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={async () => {
                try {
                  // Set loading state
                  setIsExporting(true)

                  // Fetch all users for export
                  const queryParams = new URLSearchParams({
                    page: '1',
                    limit: '10000',
                    export: 'true',
                    search: debouncedSearchTerm,
                    role: debouncedRoleFilter,
                    subscription: debouncedSubscriptionFilter
                  })

                  const response = await fetch(`/api/admin/users?${queryParams}`)

                  if (!response.ok) {
                    throw new Error("Failed to fetch users for export")
                  }

                  const data = await response.json()

                  if (data.success) {
                    exportUsersToXLSX(data.users)
                  } else {
                    toast.error("Failed to export users")
                  }
                } catch (error) {
                  console.error("Export error:", error)
                  toast.error("An error occurred while exporting users")
                } finally {
                  // Reset loading state
                  setIsExporting(false)
                }
              }}
              disabled={isExporting}
              className="whitespace-nowrap"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <ArrowDownToLine className="mr-2 h-4 w-4" /> Export
                </>
              )}
            </Button>
          </div>

          {isLoading && page === 1 ? (
            <div className="animate-pulse">

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {[...Array(6)].map((_, i) => (
                    <TableRow key={i}>

                      {/* Name */}
                      <TableCell>
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 w-24 bg-gray-200 rounded"></div>
                      </TableCell>

                      {/* Email */}
                      <TableCell>
                        <div className="h-4 w-40 bg-gray-200 rounded"></div>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
                      </TableCell>

                      {/* Subscription */}
                      <TableCell>
                        <div className="h-5 w-24 bg-gray-200 rounded-full"></div>
                      </TableCell>

                      {/* Joined */}
                      <TableCell>
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex gap-2">
                          <div className="h-4 w-4 bg-gray-200 rounded"></div>
                          <div className="h-4 w-4 bg-gray-200 rounded"></div>
                        </div>
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>

            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700">No Users Found</h3>
              <p className="text-gray-500 mt-2">
                {searchTerm || roleFilter !== 'all' || subscriptionFilter !== 'all'
                  ? "Try adjusting your search or filters"
                  : "No users have been added yet"}
              </p>
              {(searchTerm || roleFilter !== 'all' || subscriptionFilter !== 'all') && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm('')
                    setRoleFilter('all')
                    setSubscriptionFilter('all')
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <InfiniteScroll
              dataLength={filteredUsers.length}
              next={() => setPage(prevPage => prevPage + 1)}
              hasMore={hasMore}
              loader={
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
                </div>
              }
              endMessage={
                filteredUsers.length > 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No more users to load
                  </div>
                )
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">
                        {user.role === "restaurant" && user.restaurantName ? (
                          <div>{user.restaurantName}</div>
                        ) : (
                          <span className="text-black">
                            {user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1)} {user.lastName.charAt(0).toUpperCase() + user.lastName.slice(1)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.role === "admin"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : user.role === "restaurant"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-gray-50 text-gray-700 border-gray-200"
                          }
                        >
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.role === "user" ? (
                          <Badge
                            variant="outline"
                            className={
                              user.subscriptionStatus === "active"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : user.subscriptionStatus === "cancelled"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
                            }
                          >
                            {user.subscriptionStatus.charAt(0).toUpperCase() + user.subscriptionStatus.slice(1)}
                          </Badge>
                        ) : (
                          <span className="text-gray-500 text-center pl-2">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString('en-GB')}</TableCell>
                      <TableCell className="flex items-center">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/users/${user._id}`}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Eye className="h-4 w-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  View User
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteUserId(user._id)
                            setDeleteUserName(user?.role === 'restaurant' ? user.restaurantName || '' : '')
                            setDeleteConfirmationInput('')
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
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

      {/* Confirmation Popup */}
      <Dialog open={!!deleteUserId} onOpenChange={() => {
        setDeleteUserId(null)
        setDeleteUserName('')
        setDeleteConfirmationInput('')
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {(() => {
                const user = users.find(u => u._id === deleteUserId)
                if (user?.role === "restaurant") {
                  return "Deleting this restaurant user will also delete their restaurant and all related offers. This action cannot be undone."
                }
                return "Are you sure you want to delete this user? This action cannot be undone."
              })()}
            </p>
            {(() => {
              const user = users.find(u => u._id === deleteUserId)
              if (user?.role === "restaurant" && user.restaurantName) {
                return (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      To confirm deletion, please type the restaurant name: <span className="font-bold">{user.restaurantName}</span>
                    </label>
                    <Input
                      value={deleteConfirmationInput}
                      onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                      placeholder="Type restaurant name here"
                      className="w-full"
                    />
                  </div>
                )
              }
              return null
            })()}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteUserId(null)
                setDeleteUserName('')
                setDeleteConfirmationInput('')
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting || (() => {
                const user = users.find(u => u._id === deleteUserId)
                return user?.role === 'restaurant' && deleteConfirmationInput !== user.restaurantName
              })()}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

