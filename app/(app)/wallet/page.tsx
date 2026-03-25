"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RedeemCode } from "@/components/redeem-code"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface Offer {
  _id: string
  restaurantId: any
  title: string
  description: string
  validDays: string
  validHours: string
  expiryDate: string | null
  terms: string
  status: string
  dineIn: boolean
  dineOut: boolean
  areas: string[]
  offerType: string
  createdAt: string
  updatedAt: string
  redeemed: boolean
  redeemCode: string
  redeemStatus: boolean
  redeemCodeExpiry: string | number | null
  walletId: string
  phone?: string
  userPhone?: string
}

interface WalletData {
  redeemed: Offer[]
  active: Offer[]
  pagination: {
    redeemed: Pagination
    active: Pagination
  }
}

interface Pagination {
  page: number
  totalPages: number
  total: number
  limit: number
  hasNextPage: boolean
}

export default function WalletPage() {
  const router = useRouter()
  const [loadedActiveOffers, setLoadedActiveOffers] = useState<Offer[]>([])
  const [loadedRedeemedOffers, setLoadedRedeemedOffers] = useState<Offer[]>([])
  const [activePagination, setActivePagination] = useState<Pagination>({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
    hasNextPage: false
  })
  const [redeemedPagination, setRedeemedPagination] = useState<Pagination>({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
    hasNextPage: false
  })
  const [loadingMore, setLoadingMore] = useState(false)
  const [tabLoading, setTabLoading] = useState<{ active: boolean; redeemed: boolean }>({ active: true, redeemed: true })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [currentTab, setCurrentTab] = useState<"active" | "redeemed">("active")

  useEffect(() => {
    document.title = "Wallet"
  }, [])

  const fetchWallet = useCallback(
    async (page = 1, reset = true) => {
      try {
        if (reset) setTabLoading(prev => ({ ...prev, [currentTab]: true }))
        else setLoadingMore(true)

        const params = new URLSearchParams({ page: page.toString(), limit: "10" })
        const response = await fetch(`/api/wallet?${params.toString()}`)
        if (!response.ok) throw new Error("Failed to fetch wallet data")
        const data: WalletData = await response.json()

        if (reset) {
          setLoadedActiveOffers(data.active)
          setLoadedRedeemedOffers(data.redeemed)
        } else {
          setLoadedActiveOffers(prev => [...prev, ...data.active])
          setLoadedRedeemedOffers(prev => [...prev, ...data.redeemed])
        }

        const activePag = data.pagination.active
        setActivePagination({
          page: activePag.page,
          totalPages: activePag.totalPages,
          total: activePag.total,
          limit: activePag.limit,
          hasNextPage: activePag.page < activePag.totalPages
        })

        const redeemedPag = data.pagination.redeemed
        setRedeemedPagination({
          page: redeemedPag.page,
          totalPages: redeemedPag.totalPages,
          total: redeemedPag.total,
          limit: redeemedPag.limit,
          hasNextPage: redeemedPag.page < redeemedPag.totalPages
        })
      } catch (error) {
        console.error("Failed to fetch wallet data:", error)
      } finally {
        if (reset) setTabLoading(prev => ({ ...prev, [currentTab]: false }))
        else setLoadingMore(false)
      }
    },
    [currentTab]
  )

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchWallet(1, true)
  }, [fetchWallet])

  const handleMarkAsUsed = () => {
    fetchWallet(1, true)
  }

  // Infinite scroll per tab
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore) return
      const currentPag = currentTab === "active" ? activePagination : redeemedPagination
      const currentLoaded = currentTab === "active" ? loadedActiveOffers.length : loadedRedeemedOffers.length

      // Wait until all items for current page are rendered
      if (currentLoaded < currentPag.page * currentPag.limit) return
      if (currentPag.page >= currentPag.totalPages) return

      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        fetchWallet(currentPag.page + 1, false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [loadingMore, currentTab, activePagination, redeemedPagination, loadedActiveOffers.length, loadedRedeemedOffers.length, fetchWallet])

  const SkeletonCard = () => (
    <div className="animate-pulse bg-white rounded-xl shadow px-6 py-8 space-y-4">
      <div className="h-8 w-3/5 bg-gray-200 rounded"></div>
      <div className="h-6 w-full bg-gray-100 rounded"></div>
      <div className="h-6 w-5/6 bg-gray-100 rounded"></div>
      <div className="flex justify-between pt-6 gap-4">
        <div className="h-10 w-1/3 bg-gray-100 rounded"></div>
        <div className="h-10 w-1/3 bg-gray-100 rounded"></div>
      </div>
    </div>
  )

  const renderOffers = (offers: Offer[], showRedeemCode: boolean, onMarkAsUsed?: () => void) => {
    if (!offers.length && !tabLoading[currentTab]) {
      return (
        <Card >
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-gray-500">
              {currentTab === "active" ? "No active offers yet. Browse deals to redeem offers!" : "No redeemed offers yet."}
            </p>
            {currentTab === "active" && (
              <Button 
                onClick={() => router.push('/restaurants')} 
                className="bg-primary hover:bg-primary/90 text-white rounded-2xl"
              >
                Explore Offers
              </Button>
            )}
          </CardContent>
        </Card>
      )
    }

    return (
      <>
        {offers.map(offer => {
          const isExpired = offer.redeemCodeExpiry ? new Date(offer.redeemCodeExpiry) <= currentTime : false
          return (
            <RedeemCode
              key={offer.walletId}
              offer={{ ...offer, isRedeemCodeExpired: isExpired } as any}
              onMarkAsUsed={onMarkAsUsed || (() => {})}
              currentTime={currentTime}
              showRedeemCode={showRedeemCode}
            />
          )
        })}
        {loadingMore && <SkeletonCard />}
      </>
    )
  }

  return (
    <div className="container px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">My Wallet</h1>
      <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as "active" | "redeemed")} defaultValue="active">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="active">Active ({activePagination.total})</TabsTrigger>
          <TabsTrigger value="redeemed">Redeemed ({redeemedPagination.total})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {tabLoading.active && !loadingMore ? <SkeletonCard /> : renderOffers(loadedActiveOffers, true, handleMarkAsUsed)}
        </TabsContent>

        <TabsContent value="redeemed" className="space-y-4">
          {tabLoading.redeemed && !loadingMore ? <SkeletonCard /> : renderOffers(loadedRedeemedOffers, false)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
