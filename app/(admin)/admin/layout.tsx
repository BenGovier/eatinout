'use client'

import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SignOutButton } from "@/components/sign-out-button"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/context/auth-context"
import { Spinner } from "@/components/ui/spinner"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Only check once auth loading is complete
    if (!authLoading) {
      // Check if user is admin
      if (!user || user.role !== "admin") {
        console.error("Unauthorized: Not an admin");
        router.push("/sign-in");
      } else {
        // Sync offer statuses on every admin page load (fire-and-forget)
        fetch("/api/admin/sync-offer-status", { method: "POST" }).catch(() => {});
      }
    }
  }, [authLoading, user, router]);

  // Show loading while checking authentication
  if (authLoading) {
    return <Spinner />;
  }

  // If not authenticated or not admin, show loading while redirecting
  if (!user || user.role !== "admin") {
    return <Spinner />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              {/*<Logo href="/admin" />*/}
              <span className="ml-2 font-bold">Admin Portal</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              </button>
              <Button variant="outline" size="sm" className="hidden md:block">
                <SignOutButton />
              </Button>
            </div>
          </div>
        </header>
        <div className="flex flex-1">
          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-40 md:hidden">
              <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setIsMobileMenuOpen(false)}></div>
              <div className="fixed inset-y-0 left-0 w-64 bg-background p-4">
                <nav className="space-y-2">
                  <Link
                    href="/admin/dashboard"
                    className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/users"
                    className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Users
                  </Link>
                  <Link
                    href="/admin/restaurants"
                    className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Restaurants
                  </Link>
                  <Link
                    href="/admin/redeemed-offer"
                    className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Redeemed Offers
                  </Link>
                  <Link
                    href="/admin/vouchers"
                    className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Vouchers
                  </Link>
                  <Link
                    href="/admin/areas"
                    className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Areas
                  </Link>
                  <Link
                    href="/admin/categories"
                    className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Categories
                  </Link>
                  <Link
                    href="/admin/carousels"
                    className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Carousels
                  </Link>
                  <Link
                    href="/admin/tags"
                    className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Tags
                  </Link>
                  <div className="mt-4 px-3">
                    <Button variant="outline" size="sm" className="w-full">
                      <SignOutButton />
                    </Button>
                  </div>
                </nav>
              </div>
            </div>
          )}
          {/* Desktop Sidebar */}
          <aside className="w-64 border-r p-4 hidden md:block">
            <nav className="space-y-2">
              <Link
                href="/admin/dashboard"
                className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Dashboard
              </Link>
              <Link href="/admin/users" className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                Users
              </Link>
              <Link
                href="/admin/restaurants"
                className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Restaurants
              </Link>
              <Link href="/admin/redeemed-offer" className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                Redeemed Offers
              </Link>
              <Link
                href="/admin/vouchers"
                className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Vouchers
              </Link>
              <Link href="/admin/areas" className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                Areas
              </Link>
              <Link href="/admin/categories" className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                Categories
              </Link>
              <Link href="/admin/carousels" className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                Carousels
              </Link>
              <Link href="/admin/tags" className="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                Tags
              </Link>
            </nav>
          </aside>
          <main className="flex-1 p-6 overflow-hidden">{children}</main>
        </div>
      </div>
    </QueryClientProvider>
  )
}

