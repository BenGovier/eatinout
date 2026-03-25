"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { BarChart, Home, Pizza, PlusCircle, Settings, Tag } from "lucide-react"

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Restaurants",
    href: "/dashboard/restaurant",
    icon: Pizza,
  },
  {
    title: "Offers",
    href: "/dashboard/offers",
    icon: Tag,
  },
  // {
  //   title: "Create Offer",
  //   href: "/dashboard/offers/create",
  //   icon: PlusCircle,
  // },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
  // {
  //   title: "Analytics",
  //   href: "/dashboard/analytics",
  //   icon: BarChart,
  // },
  // {
  //   title: "Settings",
  //   href: "/dashboard/settings",
  //   icon: Settings,
  // }, 
]

export function RestaurantNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden md:block w-64 border-r p-6 space-y-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800",
            pathname === item.href && "bg-gray-100 dark:bg-gray-800 font-medium",
          )}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.title}</span>
        </Link>
      ))}
    </nav>
  )
}

