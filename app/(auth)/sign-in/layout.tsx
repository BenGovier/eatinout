"use client"

import type React from "react"
import { SessionProvider } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { Spinner } from "@/components/ui/spinner"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const { user, authLoading, isAuthenticated } = useAuth()
  
    useEffect(() => {
      // Only redirect once auth loading is complete
      if (!authLoading && isAuthenticated && user) {
        // Redirect authenticated users to their appropriate portal
        if (user.role === "user") {
          router.push("/restaurants")
        } else if (user.role === "restaurant") {
          router.push("/dashboard")
        } else if (user.role === "admin") {
          router.push("/admin/dashboard")
        }
      }
    }, [authLoading, isAuthenticated, user, router])
  
    // Show loading while checking authentication
    if (authLoading) {
      return (
       <Spinner/>
      )
    }
  
    // If authenticated, show loading while redirecting (don't render auth forms)
    if (isAuthenticated && user) {
      return (
        <Spinner/>
      )
    }

    return (
        <SessionProvider>{children}</SessionProvider>
    )
}

