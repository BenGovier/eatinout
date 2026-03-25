"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeft, Mail, Calendar, CreditCard, UserCog, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

const demoUsers = {
  "1": {
    _id: "1",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    role: "user",
    subscriptionStatus: "active",
    subscriptionId: "sub_123456",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  "2": {
    _id: "2",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane@example.com",
    role: "restaurant",
    subscriptionStatus: "inactive",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

interface User {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: string
  subscriptionStatus: string
  subscriptionId: string
  createdAt: string
  updatedAt: string
}

export default function UserDetailPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { id } = useParams()
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null) // popup ke liye
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    document.title = 'User'
  }, [])
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/users/${id}`)

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setUser(data.user)
            setInvoices(data.invoices || []); // Set invoices separately

            return
          }
        }

        // If no fallback data, show error
        throw new Error("Failed to fetch user details")
      } catch (err: any) {
        console.error("Error fetching user:", err)
        setError(err.message)
        toast({
          title: "Error",
          description: "Failed to load user details. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserDetails()
  }, [id])

  const handleDeleteConfirm = async () => {
    if (!deleteUserId) return
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/admin/users/${deleteUserId}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (data.success) {
        router.push("/admin/users")
        setDeleteUserId(null)
      } else {
        alert(data.message || "Failed to delete user")
      }
    } catch (error) {
      console.error(error)
      alert("Something went wrong while deleting")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateRole = async (newRole: any) => {
    try {
      const response = await fetch(`/api/admin/users/${id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        throw new Error("Failed to update user role")
      }

      // Update local state
      setUser((prev) => (prev ? { ...prev, role: newRole } : null))

      toast({
        title: "Role updated",
        description: `User role has been updated to ${newRole}.`,
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update role",
        variant: "destructive",
      })
    }
  }

  const handleUpdateSubscription = async (newStatus: any) => {
    try {
      const response = await fetch(`/api/admin/users/${id}/subscription`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update subscription status")
      }

      // Update local state
      setUser((prev) => (prev ? { ...prev, subscriptionStatus: newStatus } : null))

      toast({
        title: "Subscription updated",
        description: `Subscription status has been updated to ${newStatus}.`,
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update subscription",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">User Details</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">User Details</h1>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          <h3 className="font-bold">Error</h3>
          <p>{error || "User not found"}</p>
          <Button onClick={() => router.push("/admin/users")} className="mt-4" variant="outline">
            Return to Users
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className=" py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">User Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">
                    {user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1)} {user.lastName.charAt(0).toUpperCase() + user.lastName.slice(1)}
                  </CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">User Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <p>{user.email}</p>
                    </div>
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <p>
                          <span className="font-medium">Joined: </span>
                          {new Date(user.createdAt).toLocaleDateString('en-GB')}
                        </p>
                        <p>
                          <span className="font-medium">Last Updated: </span>
                          {new Date(user.updatedAt).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {user.role === 'user' && <div>
                  <h3 className="font-medium mb-2">Subscription Details</h3>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <CreditCard className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <p>
                          <span className="font-medium">Status: </span>
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
                        </p>
                        {user.subscriptionId && (
                          <p>
                            <span className="font-medium">Subscription ID: </span>
                            {user.subscriptionId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>}
                {invoices.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Invoices</h3>
                    <div className="space-y-4">
                      {invoices.map((invoice) => (
                        <div key={invoice.id} className="border p-4 rounded-md">
                          <p>
                            <span className="font-medium">Invoice ID: </span>
                            {invoice.id}
                          </p>
                          <p>
                            <span className="font-medium">Amount Paid: </span>
                            {(invoice.amount_paid / 100).toFixed(2)} GBP
                          </p>
                          <p>
                            <span className="font-medium">Status: </span>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </p>
                          <p>
                            <span className="font-medium">Date: </span>
                            {new Date(invoice.created * 1000).toLocaleDateString('en-GB')}
                          </p>
                          {invoice.discount && (
                            <p>
                              <span className="font-medium">Discount: </span>
                              {invoice.discount.coupon.percent_off}%
                            </p>
                          )}
                          <a
                            href={invoice.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View Invoice
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {user.role === "restaurant" && (
                  <div>
                    <h3 className="font-medium mb-2">Restaurant Information</h3>
                    <p className="text-gray-500">
                      This user is associated with a restaurant. View the restaurant details for more information.
                    </p>
                    <Button variant="outline" className="mt-2" asChild>
                      <Link href={`/admin/associated-restaurants/${id}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        View Associated Restaurant
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          {/* <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Change Role</h3>
                <div className="space-y-2">
                  {["user", "restaurant", "admin"].map((role) => (
                    <Button
                      key={role}
                      variant={user.role === role ? "default" : "outline"}
                      className="w-full"
                      onClick={() => handleUpdateRole(role)}
                      disabled={user.role === role}
                    >
                      <UserCog className="mr-2 h-4 w-4" />
                      Set as {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* <div>
                <h3 className="font-medium mb-2">Manage Subscription</h3>
                <div className="space-y-2">
                  {["active", "inactive", "cancelled"].map((status) => (
                    <Button
                      key={status}
                      variant={user.subscriptionStatus === status ? "default" : "outline"}
                      className={`w-full ${
                        status === "active"
                          ? "bg-green-600 hover:bg-green-700"
                          : status === "cancelled"
                            ? "bg-red-600 hover:bg-red-700"
                            : ""
                      }`}
                      onClick={() => handleUpdateSubscription(status)}
                      disabled={user.subscriptionStatus === status}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Set as {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div> *
            </CardContent>
          </Card> */}

          <Card >
            <CardHeader>
              <CardTitle>User Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Member Since:</span>
                <span className="font-bold">{new Date(user.createdAt).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Role:</span>
                <span className="font-bold">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Subscription:</span>
                <span className="font-bold">
                  {user.subscriptionStatus.charAt(0).toUpperCase() + user.subscriptionStatus.slice(1)}
                </span>
              </div>
          <Button
            className="w-full mt-6"
            variant=""
            size="icon"
            onClick={() => setDeleteUserId(user._id)}
          >
            <Trash2 className="h-4 w-4" /> Delete User Account
          </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ⚡ Confirmation Popup */}
      <Dialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {(() => {
              if (user?.role === "restaurant") {
                return "Deleting this restaurant user will also delete their restaurant and all related offers. This action cannot be undone"
              }
              return "Are you sure you want to delete this user? This action cannot be undone."
            })()}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteUserId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

