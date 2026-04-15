"use client"

import type React from "react"
import { useEffect } from "react"
import { Logo } from "@/components/logo"
import { AnimatedBurgerMenu } from "@/components/animated-burger-menu"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Spinner } from "@/components/ui/spinner"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

const ROLE_TO_DASHBOARD: Record<string, string> = {
  admin: "/admin/dashboard",
  restaurant: "/dashboard",
  user: "/",
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, authLoading, isAuthenticated, authError, clearAuthError } = useAuth()

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      const dashboardRoute = ROLE_TO_DASHBOARD[user.role] ?? "/"
      if (pathname !== dashboardRoute) {
        router.replace(dashboardRoute)
      }
    }
  }, [authLoading, isAuthenticated, user, router, pathname])

  if (authLoading) {
    return <Spinner />
  }

  if (isAuthenticated && user) {
    const dashboardRoute = ROLE_TO_DASHBOARD[user.role] ?? "/"
    if (pathname !== dashboardRoute) {
      return <Spinner />
    }
  }

  return (
    <>
      <div className="flex flex-col min-h-screen">
        {authError && (
          <div className="sticky top-0 z-[71] flex items-center justify-between gap-3 bg-destructive/10 border-b border-destructive/20 px-4 py-2.5 text-sm text-destructive">
            <span className="flex-1">{authError}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
              onClick={clearAuthError}
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <header className="sticky top-0 z-[70] bg-white border-b border-border shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center">
              <img src="/images/eatinoutlogo.webp" alt="EATINOUT" className="h-10" />
            </Link>
            <AnimatedBurgerMenu />
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t py-6 md:py-8">
          <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Logo size="medium" signinLogo={true} />
              <p className="text-sm text-gray-500">© {new Date().getFullYear()} Eatinout. All rights reserved.</p>
            </div>
            <div className="flex gap-4">
              <Link href="/for-restaurants" className="text-sm text-gray-500 hover:underline">
                For Restaurants
              </Link>
              <Link href="/terms" className="text-sm text-gray-500 hover:underline">
                Terms
              </Link>
              <Link href="/privacy" className="text-sm text-gray-500 hover:underline">
                Privacy
              </Link>
              <Link href="/contact" className="text-sm text-gray-500 hover:underline">
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

