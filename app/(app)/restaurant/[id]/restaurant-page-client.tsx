"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "react-toastify"
import { signOut } from "next-auth/react"
import {
  Phone,
  MapPin,
  Users,
  Gift,
  Smartphone,
  Maximize,
  FileText,
  Globe,
  ArrowLeft,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RedeemAnimation } from "@/components/redeem-animation"
import { useAuth } from "@/context/auth-context"
import { RestaurantDeal } from "@/components/restaurant-deal"
import { generateSlug } from "@/lib/utils"
import type { PublicRestaurantDetail } from "@/lib/get-public-restaurant-detail"

// Consolidated state interfaces
interface RestaurantState {
  data: any | null
  loading: boolean
  error: string | null
}

interface RedeemState {
  loadingId: string | null
  error: boolean
  showAnimation: boolean
}

interface UIState {
  showScrollArrow: boolean
  heroBlur: number
  heroOverlayOpacity: number
  showImageModal: boolean
  modalImage: string | null
  activeTab: string
}

export type RestaurantPageClientProps = {
  routeParam: string
  initialRestaurant?: PublicRestaurantDetail
  isModal?: boolean
  onClose?: () => void
}

export function RestaurantPageClient({
  routeParam,
  initialRestaurant,
  isModal = false,
  onClose,
}: RestaurantPageClientProps) {
  const searchParams = useSearchParams()
  const offerId = searchParams?.get("offerId") ?? null
  const offerSlug = searchParams?.get("offer") ?? null
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()

  const [restaurantState, setRestaurantState] = useState<RestaurantState>({
    data: initialRestaurant || null,
    loading: !initialRestaurant,
    error: null,
  })

  useEffect(() => {
    if (initialRestaurant) {
      setRestaurantState({
        data: initialRestaurant,
        loading: false,
        error: null,
      })
      return
    }

    if (routeParam) {
      setRestaurantState(prev => ({ ...prev, loading: true, error: null }))
      
      const abortController = new AbortController()
      
      fetch(`/api/restaurants/${routeParam}`, { signal: abortController.signal })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setRestaurantState({ data: data.restaurant, loading: false, error: null })
          } else {
            setRestaurantState({ data: null, loading: false, error: data.message || "Failed to load restaurant details." })
          }
        })
        .catch(err => {
          if (err.name === 'AbortError') return
          setRestaurantState({ data: null, loading: false, error: "Failed to load restaurant details." })
        })
        
      return () => abortController.abort()
    }
  }, [initialRestaurant, routeParam])

  const [redeemState, setRedeemState] = useState<RedeemState>({
    loadingId: null,
    error: false,
    showAnimation: false
  })

  const [uiState, setUIState] = useState<UIState>({
    showScrollArrow: true,
    heroBlur: 0,
    heroOverlayOpacity: 0.6,
    showImageModal: false,
    modalImage: null,
    activeTab: offerId ? "offers" : "offers"
  })

  const offerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // All memoized derived data must be before any conditional returns (Rules of Hooks)
  const restaurant = restaurantState.data
  const cuisines = useMemo(() => restaurant?.category?.map((c: any) => c.name) || [], [restaurant?.category])
  const heroImage = useMemo(() => restaurant?.imageUrl || "/placeholder.svg", [restaurant?.imageUrl])
  const fullAddress = useMemo(() => restaurant?.address || "Address not available", [restaurant?.address])
  const phone = useMemo(() => restaurant?.phone || "Phone not available", [restaurant?.phone])
  const offers = useMemo(() => restaurant?.offers || [], [restaurant?.offers])
  const membersUsed = 1274

  // Presentational only: which offer (if any) is deep-linked, so its compact
  // card can render expanded. Does not affect the scroll effect below.
  const deepLinkOfferId = useMemo(() => {
    if (offerId) return offerId
    if (offerSlug && offers.length > 0) {
      const match = offers.find(
        (offer: any) => generateSlug(offer.offerTitle || offer.title || "", offer.id) === offerSlug,
      )
      return match?.id ?? null
    }
    return null
  }, [offerId, offerSlug, offers])


  useEffect(() => {
    const name = restaurantState.data?.name
    document.title = name && name.length > 0 ? name : "Restaurant"
  }, [restaurantState.data?.name])

  // Optimized scroll and UI effects with proper throttling
  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollPercent = Math.min(window.scrollY / 300, 1)
          setUIState(prev => ({
            ...prev,
            heroBlur: scrollPercent * 10,
            heroOverlayOpacity: Math.max(0.6 - scrollPercent * 0.6, 0)
          }))
          ticking = false
        })
        ticking = true
      }
    }

    const timer = setTimeout(() => {
      setUIState(prev => ({ ...prev, showScrollArrow: false }))
    }, 3000)

    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
      clearTimeout(timer)
    }
  }, [])

  const handleRedeem = useCallback(async (offerId: string, offerRestaurantId: string) => {
    if (!isAuthenticated) {
      // Redirect new visitors to sign-up with current URL as redirect parameter
      const currentUrl = window.location.pathname + window.location.search;
      router.push(`/sign-up?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }
    
    setRedeemState(prev => ({ ...prev, loadingId: offerId }));
    
    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offerId,
          offerStatus: "redeemed",
          offerRestaurantId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 410) {
          // Offer fully claimed
          toast.error(data.message || "This offer has reached its redemption limit");
        } else if (response.status === 409) {
          // Already redeemed by this user
          toast.error("You have already redeemed this offer");
        } else if (response.status === 403 && data?.error === "Only users can redeem offers") {
          toast.error("Only users can add offers to wallet");
          await fetch("/api/auth/logout", {
            method: "POST",
          });
          await signOut({ callbackUrl: "/sign-in" });
        } else {
          toast.error(data.error || "Failed to add offer to wallet");
        }
        setRedeemState(prev => ({ ...prev, error: true, loadingId: null }));
        return;
      }

      // Success - show animation then redirect to wallet
      setRedeemState(prev => ({ ...prev, showAnimation: true }));
      // Animation will handle the redirect after completion
    } catch (err: any) {
      console.error("Error redeeming offer:", err);
      toast.error("An error occurred while redeeming the offer");
      setRedeemState(prev => ({ ...prev, error: true, loadingId: null }));
    }
  }, [isAuthenticated, router]);

  const handleAnimationComplete = useCallback(() => {
    setRedeemState(prev => ({ ...prev, showAnimation: false, loadingId: null }));
    // Redirect to wallet after animation completes using Next.js router
    setTimeout(() => {
      router.push(`/wallet`);
    }, 300);
  }, [router]);

  // Optimized auto-scroll to specific offer if offerId or offer slug is in URL
  useEffect(() => {
    if (!restaurantState.data) return

    let targetOfferId: string | null = null;
    
    // If offerId is provided, use it directly
    if (offerId) {
      targetOfferId = offerId;
    } 
    // If offer slug is provided, find the matching offer by slug
    else if (offerSlug && offers.length > 0) {
      const matchingOffer = offers.find((offer: any) => {
        // Slug format: offer-title-{last6chars}
        const slug = generateSlug(offer.offerTitle || offer.title || "", offer.id);
        return slug === offerSlug;
      });
      if (matchingOffer) {
        targetOfferId = matchingOffer.id;
      }
    }

    if (targetOfferId && offerRefs.current[targetOfferId]) {
      // Wait a bit for the DOM to fully render
      const timer = setTimeout(() => {
        const element = offerRefs.current[targetOfferId!]
        if (element) {
          // Scroll to the offer with smooth behavior and offset for header
          const yOffset = -20 // Offset from top
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
          window.scrollTo({ top: y, behavior: 'smooth' })

          // Optional: Add a highlight effect
          element.style.transition = 'all 0.3s ease'
          element.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.5)'
          setTimeout(() => {
            element.style.boxShadow = ''
          }, 2000)
        }
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [offerId, offerSlug, restaurantState.data, offers])

  // Memoized image modal handlers
  const handleImageClick = useCallback((img: string) => {
    setUIState(prev => ({ ...prev, showImageModal: true, modalImage: img }));
  }, []);

  const closeModal = useCallback(() => {
    setUIState(prev => ({ ...prev, showImageModal: false, modalImage: null }));
  }, []);


  if (!restaurant && restaurantState.loading) {
    if (isModal) {
      return (
        <div className="flex h-64 w-full flex-col items-center justify-center space-y-4 bg-white relative rounded-2xl overflow-hidden shadow-2xl">
          {onClose && (
            <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
          <p className="text-sm font-medium text-gray-500 animate-pulse">Loading deal details...</p>
        </div>
      )
    }
    return (
      <div className="flex h-[50vh] min-h-[400px] w-full flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
        <p className="text-sm font-medium text-gray-500 animate-pulse">Loading restaurant...</p>
      </div>
    )
  }

  if (!restaurant) {
    if (isModal) {
      return (
        <div className="flex h-64 w-full flex-col items-center justify-center space-y-4 bg-white relative rounded-2xl overflow-hidden shadow-2xl">
          {onClose && (
            <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
          <Globe className="h-8 w-8 text-red-600 opacity-20" />
          <p className="text-sm text-gray-500 font-bold">{restaurantState.error || "Could not load details."}</p>
          <p className="text-xs text-gray-400 mt-2 text-center">ID: {routeParam}</p>
        </div>
      )
    }
    return (
      <div className="flex h-[50vh] min-h-[400px] w-full flex-col items-center justify-center space-y-4">
        <div className="rounded-full bg-red-100 p-3">
          <Globe className="h-8 w-8 text-red-600" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Restaurant not found</h2>
          <p className="text-sm text-gray-500 mt-1">We couldn&apos;t load this restaurant&apos;s details.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  if (isModal) {
    return (
      <div className="w-full flex flex-col h-full bg-white relative rounded-2xl overflow-hidden shadow-2xl">
        {onClose && (
          <button onClick={onClose} className="absolute right-3 top-3 z-[60] p-1.5 bg-gray-100 rounded-full hover:bg-gray-200">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        )}
        <RedeemAnimation isVisible={redeemState.showAnimation} onComplete={handleAnimationComplete} />
        <div className="px-1 py-4 space-y-4 flex-1 overflow-y-auto">
          <div className="sticky top-0 bg-white/95 backdrop-blur z-10 pb-2 border-b border-gray-100 mb-4 px-2 pt-2">
             <h2 className="text-xl font-bold text-dark-ink pr-8">{restaurant.name}</h2>
             <p className="text-sm text-gray-500">{restaurant.location || restaurant.address}</p>
          </div>
          {offers.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="font-medium text-dark-ink">No active offers right now</p>
            </div>
          ) : (
            offers.map((offer: any, index: number) => (
              <div key={offer.id}>
                <div ref={(el) => { offerRefs.current[offer.id] = el }}>
                  <RestaurantDeal
                    deal={offer}
                    phoneNumber={phone}
                    membersUsed={membersUsed}
                    onRedeem={handleRedeem}
                    isLoading={redeemState.loadingId}
                    style={{ animationDelay: `${index * 100}ms` }}
                    featured={index === 0}
                    defaultExpanded={offer.id === deepLinkOfferId}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  const canViewFullDetails = isAuthenticated && user?.role === "user"


  return (
    <div className="min-h-screen bg-[#FFFBF7] pb-24 lg:pb-0">
      <RedeemAnimation isVisible={redeemState.showAnimation} onComplete={handleAnimationComplete} />

      <div className="relative h-56 animate-in fade-in duration-500 overflow-hidden">
        <Image
          src={heroImage}
          alt={restaurant.name}
          fill
          className="object-cover transition-transform duration-[3000ms] hover:scale-105"
          priority={true}
          sizes="100vw"
          quality={80}
          fetchPriority="high"
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent transition-opacity duration-300"
          style={{ opacity: Math.max(uiState.heroOverlayOpacity, 0.5) }}
        />
        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.back()}
            className="bg-white/90 hover:bg-white text-gray-900 backdrop-blur-sm shadow-lg border-0 rounded-full h-10 w-10 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          {offers.length > 0 && (
            <Badge className="mb-2 bg-primary text-white border-0 text-xs font-semibold shadow-md">
              {offers.length} {offers.length === 1 ? "offer" : "offers"} available
            </Badge>
          )}
          <h1 className="text-2xl font-bold text-white mb-2 text-balance drop-shadow-sm" style={{ fontFamily: "var(--font-heading)" }}>
            {restaurant.name}
          </h1>
          <div className="flex flex-wrap gap-2">
            {cuisines.map((cuisine: string) => (
              <Badge key={cuisine} className="bg-white/95 text-[#475569] border-0 text-xs font-medium">
                {cuisine}
              </Badge>
            ))}
            {restaurant.area?.length > 0 &&
              restaurant.area.map((area: any) => (
                <Badge
                  key={area.id}
                  className="bg-white/95 text-[#475569] border-0 text-xs font-medium"
                >
                  <MapPin className="h-3 w-3 mr-1" aria-hidden="true" />
                  {area.name}
                </Badge>
              ))}
          </div>
        </div>
      </div>

      <Tabs 
        value={uiState.activeTab} 
        onValueChange={(value) => setUIState(prev => ({ ...prev, activeTab: value }))} 
        className="w-full"
      >
        <TabsList className="flex w-full gap-2 rounded-none bg-transparent h-auto p-3 mb-2 sticky top-0 z-30 bg-[#FFFBF7]/90 backdrop-blur-sm border-b border-lines/60">
          <TabsTrigger
            value="information"
            className="flex-1 rounded-full border border-lines bg-white text-dark-ink/70 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(227,30,36,0.2)] px-3 py-2.5 font-medium text-sm transition-colors"
          >
            Information
          </TabsTrigger>
          <TabsTrigger
            value="offers"
            className="flex-1 rounded-full border border-lines bg-white text-dark-ink/70 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(227,30,36,0.2)] px-3 py-2.5 font-medium text-sm transition-colors"
          >
            Offers ({offers.length})
          </TabsTrigger>
          <TabsTrigger
            value="gallery"
            className="flex-1 rounded-full border border-lines bg-white text-dark-ink/70 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(227,30,36,0.2)] px-3 py-2.5 font-medium text-sm transition-colors"
          >
            Gallery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offers" className="px-4 py-6 space-y-6 animate-in fade-in duration-700">
          <div className="mb-1">
            <h2
              className="text-lg font-bold text-dark-ink"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Available offers
            </h2>
            {!canViewFullDetails && (
              <p className="text-sm text-dark-ink/60 mt-0.5">
                Start free to unlock this restaurant&apos;s offers.
              </p>
            )}
          </div>
          {offers.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200 animate-in fade-in duration-700">
              <p className="font-medium text-dark-ink">No active offers right now</p>
              <p className="text-sm text-dark-ink/60 mt-1">Check back later for new deals!</p>
            </div>
          ) : (
            offers.map((offer: any, index: number) => (
            <div key={offer.id}>
              <div ref={(el) => { offerRefs.current[offer.id] = el }}>
                <RestaurantDeal
                  deal={offer}
                  phoneNumber={phone}
                  membersUsed={membersUsed}
                  onRedeem={handleRedeem}
                  isLoading={redeemState.loadingId}
                  style={{ animationDelay: `${index * 100}ms` }}
                  featured={index === 0}
                  defaultExpanded={offer.id === deepLinkOfferId}
                />
              </div>

              {/* Compact unlock explainer, placed directly under the featured offer */}
              {index === 0 && !canViewFullDetails && (
                <Card
                  className="mt-6 rounded-2xl shadow-md border-lines p-5 bg-gradient-to-br from-white to-soft-bg animate-in fade-in duration-700"
                  style={{ animationDelay: "150ms" }}
                >
                  <h3
                    className="text-base font-bold text-dark-ink mb-4 text-center"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Unlock your discount in 3 easy steps
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="w-10 h-10 rounded-full bg-[#FFF1F2] border-2 border-primary/20 flex items-center justify-center mx-auto mb-2">
                        <Smartphone className="h-5 w-5 text-primary" aria-hidden="true" />
                      </div>
                      <p className="text-xs font-semibold text-dark-ink">1. Pick an offer</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 rounded-full bg-[#FFF1F2] border-2 border-primary/20 flex items-center justify-center mx-auto mb-2">
                        <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                      </div>
                      <p className="text-xs font-semibold text-dark-ink">2. Start 30 days free</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 rounded-full bg-[#FFF1F2] border-2 border-primary/20 flex items-center justify-center mx-auto mb-2">
                        <Gift className="h-5 w-5 text-primary" aria-hidden="true" />
                      </div>
                      <p className="text-xs font-semibold text-dark-ink">3. Show your voucher when you visit</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={() => {
                        const currentUrl = window.location.pathname + window.location.search;
                        router.push(`/sign-up?redirect=${encodeURIComponent(currentUrl)}`);
                      }}
                      className="bg-primary hover:bg-primary/90 text-white font-semibold"
                    >
                      Start 30 days free
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const currentUrl = window.location.pathname + window.location.search;
                        router.push(`/sign-in?redirect=${encodeURIComponent(currentUrl)}`);
                      }}
                      className="border-primary text-primary hover:bg-primary/5 font-semibold"
                    >
                      Log in
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )))}
        </TabsContent>

        <TabsContent value="information" className="px-4 py-6">
          <Card className="rounded-2xl shadow-md border-lines p-6">
            {restaurant.description && (
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-2 text-dark-ink" style={{ fontFamily: "var(--font-heading)" }}>
                  About
                </h3>
                <p className="text-muted-foreground text-sm">{restaurant.description}</p>
              </div>
            )}
            <h3 className="font-bold text-lg mb-4 text-dark-ink" style={{ fontFamily: "var(--font-heading)" }}>
              Contact Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-dark-ink">Address</p>
                  <p className="text-muted-foreground text-sm">{fullAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-dark-ink">Phone</p>
                  <a
                    href={`tel:${phone}`}
                    className="text-primary text-sm focus:ring-2 focus:ring-primary rounded"
                  >
                    {phone}
                  </a>
                </div>
              </div>
              {restaurant.website && (
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-primary mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-dark-ink">Website</p>
                    <a
                      href={restaurant.website.startsWith("http") ? restaurant.website : `https://${restaurant.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm focus:ring-2 focus:ring-primary rounded"
                    >
                      {restaurant.website}
                    </a>
                  </div>
                </div>
              )}
              {restaurant.menuPdfUrls && restaurant.menuPdfUrls.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {restaurant.menuPdfUrls.map((url: string, index: number) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`
        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium 
        shadow-sm transition transform hover:scale-105
        border border-red-600 text-red-600
      `}
                      title="Click to view menu"
                    >
                      <FileText className="w-4 h-4" />
                      Menu {restaurant.menuPdfUrls.length > 1 ? index + 1 : ""}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="gallery" className="px-4 py-6">
          <h2 className="text-xl font-bold mb-4 text-dark-ink">Photo Gallery</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {restaurant.galleryImages &&
              restaurant.galleryImages.map((image: string, index: number) => (
                <div key={index} className="relative aspect-video rounded-md overflow-hidden group cursor-pointer">
                  <Image
                    src={image || "/placeholder.svg"}
                    alt={`${restaurant.name} - Image ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    sizes="(max-width: 768px) 50vw, 33vw"
                    quality={85}
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 z-10 
                      opacity-100 md:opacity-0 
                      md:group-hover:opacity-100 
                      transition-opacity bg-black/60 
                      rounded-full p-1"
                    onClick={() => handleImageClick(image)}
                    tabIndex={-1}
                    aria-label="View full size"
                  >
                    <Maximize className="text-white w-5 h-5" />
                  </button>
                </div>
              ))}
            {(!restaurant.galleryImages || restaurant.galleryImages.length === 0) && (
              <div className="col-span-3 text-center py-8">
                <p className="text-muted-foreground">No gallery images available.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {uiState.showImageModal && uiState.modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={closeModal}
        >
          <div
            className="relative max-w-3xl w-full"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-1 right-2 text-white text-2xl z-10"
              onClick={closeModal}
              aria-label="Close"
            >
              &times;
            </button>
            <Image
              src={uiState.modalImage}
              alt="Full Size"
              width={800}
              height={600}
              className="w-full h-auto rounded-lg shadow-lg"
              style={{ maxHeight: "90vh", objectFit: "contain" }}
              loading="lazy"
            />
          </div>
        </div>
      )}
      {/* Mobile-only sticky CTA for logged-out users */}
      {!canViewFullDetails && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-lines bg-white/95 backdrop-blur-sm px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-dark-ink leading-tight">Unlock this offer</p>
              <p className="text-xs text-dark-ink/60 truncate">Start 30 days free</p>
            </div>
            <Button
              onClick={() => {
                const currentUrl = window.location.pathname + window.location.search;
                router.push(`/sign-up?redirect=${encodeURIComponent(currentUrl)}`);
              }}
              className="flex-shrink-0 bg-primary hover:bg-primary/90 text-white font-bold px-5 rounded-lg shadow-[0_4px_14px_rgba(227,30,36,0.25)]"
            >
              Start free
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
