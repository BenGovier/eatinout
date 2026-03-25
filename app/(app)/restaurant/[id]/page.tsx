"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Image from "next/image"
import { useParams, useRouter, useSearchParams } from "next/navigation"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RedeemAnimation } from "@/components/redeem-animation"
import { useAuth } from "@/context/auth-context"
import { RestaurantDeal } from "@/components/restaurant-deal"
import { generateSlug } from "@/lib/utils"


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

export default function RestaurantPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { id } = params
  const offerId = searchParams?.get('offerId')
  const offerSlug = searchParams?.get('offer')
  const router = useRouter()
  const { isAuthenticated, authLoading , user } = useAuth();


  // Consolidated state management
  const [restaurantState, setRestaurantState] = useState<RestaurantState>({
    data: null,
    loading: true,
    error: null
  })

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

  // Fix hydration issue by calculating today only on client-side
  const [today, setToday] = useState<string>("")

  // All memoized derived data must be before any conditional returns (Rules of Hooks)
  const restaurant = restaurantState.data
  const cuisines = useMemo(() => restaurant?.category?.map((c: any) => c.name) || [], [restaurant?.category])
  const heroImage = useMemo(() => restaurant?.imageUrl || "/placeholder.svg", [restaurant?.imageUrl])
  const fullAddress = useMemo(() => restaurant?.address || "Address not available", [restaurant?.address])
  const phone = useMemo(() => restaurant?.phone || "Phone not available", [restaurant?.phone])
  const offers = useMemo(() => restaurant?.offers || [], [restaurant?.offers])
  const membersUsed = 1274


  useEffect(() => {
    document.title = "Restaurant"
  }, [])

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

  useEffect(() => {
    // Fix hydration issue by calculating today only on client-side
    setToday(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()])
  }, [])

  const handleRedeem = useCallback(async (offerId: string, offerRestaurantId: string) => {
    if (!isAuthenticated) {
      // Redirect to sign-in page with current URL as redirect parameter
      const currentUrl = window.location.pathname + window.location.search;
      router.push(`/sign-in?redirect=${encodeURIComponent(currentUrl)}`);
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
  }, [isAuthenticated, id, router]);

  const handleAnimationComplete = useCallback(() => {
    setRedeemState(prev => ({ ...prev, showAnimation: false, loadingId: null }));
    // Redirect to wallet after animation completes using Next.js router
    setTimeout(() => {
      router.push(`/wallet`);
    }, 300);
  }, [router]);

  // Optimized restaurant fetching with better error handling
  useEffect(() => {
    const fetchRestaurant = async () => {
      setRestaurantState({ loading: true, error: null, data: null })

      try {
        const response = await fetch(`/api/restaurants/${params.id}`)

        if (!response.ok) {
          throw new Error("Failed to fetch restaurant data")
        }

        const data = await response.json()

        if (data.success && data.restaurant) {
          setRestaurantState({ loading: false, error: null, data: data.restaurant })
        } else {
          throw new Error(data.message || "Restaurant not found")
        }
      } catch (err: any) {
        console.error("Error fetching restaurant:", err)
        setRestaurantState({ loading: false, error: err.message || "Failed to load restaurant", data: null })
      }
    }

    if (params.id) {
      fetchRestaurant()
    }
  }, [params.id])

  // Optimized auto-scroll to specific offer if offerId or offer slug is in URL
  useEffect(() => {
    if (!restaurantState.data || restaurantState.loading) return;

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
  }, [offerId, offerSlug, restaurantState.data, restaurantState.loading, offers])

  // Memoized image modal handlers
  const handleImageClick = useCallback((img: string) => {
    setUIState(prev => ({ ...prev, showImageModal: true, modalImage: img }));
  }, []);

  const closeModal = useCallback(() => {
    setUIState(prev => ({ ...prev, showImageModal: false, modalImage: null }));
  }, []);


  if (restaurantState.loading) {
    return (
      <div className="container px-4 py-8 min-h-[50vh] space-y-6">
        {/* Hero Image Skeleton */}
        <div className="w-full h-56 bg-gray-200 rounded-xl animate-pulse" />

        {/* Badges Skeleton */}
        <div className="flex gap-2">
          <div className="w-20 h-6 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="w-16 h-6 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="w-24 h-6 bg-gray-200 rounded-full animate-pulse"></div>
        </div>

        {/* Info Cards Skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 rounded-xl animate-pulse"
            ></div>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded-md w-1/4 animate-pulse"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 bg-gray-200 rounded-2xl animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (restaurantState.error || !restaurantState.data) {
    return (
      <div className="container px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Restaurant not found</h1>
        <p>Sorry, we couldn't find the restaurant you're looking for.</p>
        <p className="text-sm text-gray-500 mt-2">Error: {restaurantState.error || "Unknown error"}</p>
        <Button asChild className="mt-4">
          <a href="/restaurants">Browse Restaurants</a>
        </Button>
      </div>
    )
  }

  const canViewFullDetails = isAuthenticated && user?.role === "user"


  return (
    <div className="min-h-screen bg-soft-bg bg-gray-50">
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
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent transition-opacity duration-300"
          style={{ opacity: uiState.heroOverlayOpacity }}
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
          <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            {restaurant.name}
          </h1>
          <div className="flex flex-wrap gap-2">
            {cuisines.map((cuisine: string) => (
              <Badge key={cuisine} className="bg-[#F1F5F9] text-[#475569] border-0 text-xs font-medium">
                {cuisine}
              </Badge>
            ))}
            {restaurant.area?.length > 0 &&
              restaurant.area.map((area: any) => (
                <Badge
                  key={area.id}
                  className="bg-[#F1F5F9] text-[#475569] border-0 text-xs font-medium"
                >
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
        <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-lines bg-white h-auto p-0 mb-6">
          <TabsTrigger
            value="information"
            className="rounded-none border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 font-medium"
          >
            Information
          </TabsTrigger>
          <TabsTrigger
            value="offers"
            className="rounded-none border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 font-medium"
          >
            Offers ({offers.length})
          </TabsTrigger>
          <TabsTrigger
            value="gallery"
            className="rounded-none border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 font-medium"
          >
            Gallery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offers" className="px-4 py-6 space-y-6 animate-in fade-in duration-700">
          {offers.map((offer: any, index: number) => (
            <div
              key={offer.id}
              ref={(el) => { offerRefs.current[offer.id] = el }}
            >
              <RestaurantDeal
                deal={offer}
                phoneNumber={phone}
                membersUsed={membersUsed}
                onRedeem={handleRedeem}
                isLoading={redeemState.loadingId}
                style={{ animationDelay: `${index * 100}ms` }}
              />
            </div>
          ))}
          {!canViewFullDetails && (
            <>
              <Card
                className="rounded-2xl shadow-md border-lines p-6 bg-gradient-to-br from-white to-soft-bg animate-in fade-in duration-700"
                style={{ animationDelay: "300ms" }}
              >
                <h3
                  className="text-xl font-bold text-dark-ink mb-2 text-center"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Unlock your discount in 3 easy steps
                </h3>
                <p className="text-sm text-muted-foreground text-center mb-6">It's quick, simple, and free to try</p>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-[#FFF1F2] border-2 border-primary/20 flex items-center justify-center mx-auto mb-3 transition-transform hover:scale-110">
                      <Smartphone className="h-7 w-7 text-primary" aria-hidden="true" />
                    </div>
                    <p className="text-xs font-semibold text-dark-ink mb-1">1. Tap Get Offer Code</p>
                    <p className="text-xs text-muted-foreground">Click the button above</p>
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-[#FFF1F2] border-2 border-primary/20 flex items-center justify-center mx-auto mb-3 transition-transform hover:scale-110">
                      <Users className="h-7 w-7 text-primary" aria-hidden="true" />
                    </div>
                    <p className="text-xs font-semibold text-dark-ink mb-1">2. Sign up</p>
                    <p className="text-xs text-muted-foreground">Free trial included</p>
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-[#FFF1F2] border-2 border-primary/20 flex items-center justify-center mx-auto mb-3 transition-transform hover:scale-110">
                      <Gift className="h-7 w-7 text-primary" aria-hidden="true" />
                    </div>
                    <p className="text-xs font-semibold text-dark-ink mb-1">3. Show code</p>
                    <p className="text-xs text-muted-foreground">At the venue</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => {
                      const currentUrl = window.location.pathname + window.location.search;
                      router.push(`/sign-in?redirect=${encodeURIComponent(currentUrl)}`);
                    }}
                    className="bg-primary hover:bg-primary/90 text-white font-semibold"
                  >
                    Login to view full details
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const currentUrl = window.location.pathname + window.location.search;
                      router.push(`/sign-up?redirect=${encodeURIComponent(currentUrl)}`);
                    }}
                    className="border-primary text-primary hover:bg-primary/5 font-semibold"
                  >
                    Sign up
                  </Button>
                </div>
              </Card>

            </>
          )}
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
    </div>
  )
}