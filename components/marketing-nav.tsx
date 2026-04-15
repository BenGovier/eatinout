"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/deal", label: "Offers" },
  // { href: "/for-restaurants", label: "For Restaurants" },
  // { href: "/about", label: "About" },
]

export function MarketingNav() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()

  const handleCheckAuthentication = async () => {
    setIsLoading(true)
    try {
      // Make API call to verify token and get user data
      const response = await fetch("/api/auth/verify-token", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok && data.user) {
        const userRole = data.user.role

        // Redirect based on user role
        if (userRole === "user") {
          router.push("/")
        } else if (userRole === "restaurant") {
          router.push("/dashboard") // Redirect restaurant to dashboard
        } else if (userRole === "admin") {
          router.push("/admin/dashboard") // Redirect admin to admin dashboard
        } else {
          console.log("Unknown role")
        }
      } else {
        router.push("/sign-in")
        console.error("Invalid user or role")
      }
    } catch (error) {
      console.error("Error verifying token:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <nav className="flex items-center space-x-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-red-600",
            // Active link
            pathname === item.href ? "text-red-600" : "text-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
      <div className="hidden sm:flex items-center space-x-4">
        {/* <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer"
          asChild
          onClick={handleCheckAuthentication} // Trigger auth check on button click
        >
          <span>{isLoading ? "Sign in" : "Sign in"}</span>
        </Button> */}
        {/* Show button only if route is NOT '/for-restaurants' */}
        {pathname !== "/for-restaurants" && (
          <Button
            variant="default"
            size="sm"
            className="cursor-pointer"
            onClick={() => router.push("/sign-in")}
          >
            <span>Get Started</span>
          </Button>
        )}
      </div>
    </nav>
  )
}
