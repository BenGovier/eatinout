"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, Wallet, User, Grid2X2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWallet } from "@/context/wallet-context"

export function MobileNav() {
  const pathname = usePathname()
  const { redeemedOffers } = useWallet()

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-red-600 border-t border-red-700 md:hidden">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto">
        <Link
          href="/restaurants"
          className={cn(
            "inline-flex flex-col items-center justify-center px-5 text-white hover:bg-red-700",
            pathname === "/restaurants" && "text-white font-medium",
          )}
        >
          <Search className="w-6 h-6 mb-1" />
          <span className="text-xs">Restaurants</span>
        </Link>
        <Link
          href="/categories"
          className={cn(
            "inline-flex flex-col items-center justify-center px-5 text-white hover:bg-red-700",
            pathname === "/categories" && "text-white font-medium",
          )}
        >
          <Grid2X2 className="w-6 h-6 mb-1" />
          <span className="text-xs">Categories</span>
        </Link>
        <Link
          href="/wallet"
          className={cn(
            "inline-flex flex-col items-center justify-center px-5 text-white hover:bg-red-700 relative",
            pathname === "/wallet" && "text-white font-medium",
          )}
        >
          <Wallet className="w-6 h-6 mb-1" />
          {redeemedOffers.length > 0 && (
            <span className="absolute top-0 right-3 bg-white text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {redeemedOffers.length}
            </span>
          )}
          <span className="text-xs">Wallet</span>
        </Link>
        <Link
          href="/account"
          className={cn(
            "inline-flex flex-col items-center justify-center px-5 text-white hover:bg-red-700",
            pathname === "/account" && "text-white font-medium",
          )}
        >
          <User className="w-6 h-6 mb-1" />
          <span className="text-xs">Account</span>
        </Link>
      </div>
    </div>
  )
}

