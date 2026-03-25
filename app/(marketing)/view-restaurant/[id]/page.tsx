"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { toast } from "react-toastify"
import { signOut } from "next-auth/react"
import {
  Phone,
  MapPin,
  Users,
  Shield,
  Gift,
  Smartphone,
  Store,
  PiggyBank,
  Maximize,
  FileText,
  Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RedeemAnimation } from "@/components/redeem-animation"
import { useAuth } from "@/context/auth-context"
import { RestaurantDeal } from "@/components/restaurant-deal"

const testimonialPool = [
  { name: "Katie", location: "Preston", quote: "Saved £40 in my first week!", avatar: "/new-img/testimonial-1.webp" },
  {
    name: "Mike",
    location: "Blackpool",
    quote: "So many great restaurants to choose from",
    avatar: "/new-img/testimonial-2.webp",
  },
  { name: "Sarah", location: "Lytham", quote: "Best decision for eating out regularly", avatar: "/new-img/testimonial-3.webp" },
  { name: "James", location: "Bolton", quote: "The variety of offers is incredible", avatar: "/new-img/testimonial-4.webp" },
  { name: "Emma", location: "Preston", quote: "Pays for itself after just 2 meals", avatar: "/new-img/testimonial-5.webp" },
  {
    name: "David",
    location: "Blackpool",
    quote: "Love trying new places with these deals",
    avatar: "/new-img/testimonial-6.webp",
  },
  { name: "Lisa", location: "Lytham", quote: "Makes dining out so much more affordable", avatar: "/new-img/testimonial-7.webp" },
  { name: "Tom", location: "Bolton", quote: "Easy to use and great savings", avatar: "/new-img/testimonial-8.webp" },
  { name: "Rachel", location: "Preston", quote: "Discovered so many hidden gems", avatar: "/new-img/testimonial-9.webp" },
  { name: "Chris", location: "Blackpool", quote: "The app is super simple to use", avatar: "/new-img/testimonial-10.webp" },
  { name: "Sophie", location: "Lytham", quote: "Brilliant for date nights", avatar: "/new-img/testimonial-11.webp" },
  { name: "Mark", location: "Bolton", quote: "Saved over £200 this year", avatar: "/new-img/testimonial-12.webp" },
  { name: "Hannah", location: "Preston", quote: "Quality restaurants at better prices", avatar: "/new-img/testimonial-13.webp" },
  { name: "Paul", location: "Blackpool", quote: "Worth every penny of the membership", avatar: "/new-img/testimonial-14.webp" },
  {
    name: "Amy",
    location: "Lytham",
    quote: "My friends all joined after seeing my savings",
    avatar: "/new-img/testimonial-15.webp",
  }]

export default function RestaurantPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { id } = params
  const offerId = searchParams?.get('offerId')
  const [restaurant, setRestaurant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redeemLoadingId, setRedeemLoadingId] = useState<string | null>(null)
  const [redeemError, setRedeemError] = useState(false)
  const [showScrollArrow, setShowScrollArrow] = useState(true)
  const [heroBlur, setHeroBlur] = useState(0)
  const [heroOverlayOpacity, setHeroOverlayOpacity] = useState(0.6)
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0)
  const [showImageModal, setShowImageModal] = useState(false)
  const [modalImage, setModalImage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(offerId ? "offers" : "offers")
  const offerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const { isAuthenticated } = useAuth();

  // Compute the visible 6 testimonials based on current index
  const visibleTestimonials = Array.from({ length: 3 }, (_, i) => {
    return testimonialPool[(currentTestimonialIndex + i) % testimonialPool.length];
  });

  useEffect(() => {
    document.title = "Restaurant"
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = Math.min(window.scrollY / 300, 1)
      setHeroBlur(scrollPercent * 10)
      setHeroOverlayOpacity(Math.max(0.6 - scrollPercent * 0.6, 0))
    }
    window.addEventListener("scroll", handleScroll)

    const timer = setTimeout(() => setShowScrollArrow(false), 3000)

    const testimonialInterval = setInterval(() => {
      setCurrentTestimonialIndex((prev) => (prev + 1) % testimonialPool.length)
    }, 4000)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      clearTimeout(timer)
      clearInterval(testimonialInterval)
    }
  }, [])


  const handleRedeem = async (offerId: string, offerRestaurantId: string) => {
    if (!isAuthenticated) {
      // Redirect to sign-in page for restaurants
      window.location.href = `/sign-in?fromRestaurants=true&restaurantId=${id}`;
      return;
    }
    setRedeemLoadingId(offerId);
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
        setRedeemError(true);
        return;
      }

      // Success - redirect to wallet
      setTimeout(() => {
        window.location.href = `/wallet`;
      }, 500);
    } catch (err: any) {
      console.error("Error redeeming offer:", err);
      toast.error("An error occurred while redeeming the offer");
      setRedeemError(true);
    } finally {
      setRedeemLoadingId(null);
    }
  };

  useEffect(() => {
    const fetchRestaurant = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/restaurants/${params.id}`)

        if (!response.ok) {
          throw new Error("Failed to fetch restaurant data")
        }

        const data = await response.json()

        if (data.success && data.restaurant) {
          setRestaurant(data.restaurant)
        } else {
          throw new Error(data.message || "Restaurant not found")
        }
      } catch (err: any) {
        console.error("Error fetching restaurant:", err)
        setError(err.message || "Failed to load restaurant")
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurant()
  }, [params.id])

  // Auto-scroll to specific offer if offerId is in URL
  useEffect(() => {
    if (offerId && restaurant && offerRefs.current[offerId]) {
      // Wait a bit for the DOM to fully render
      const timer = setTimeout(() => {
        const element = offerRefs.current[offerId]
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
  }, [offerId, restaurant, loading])

  const handleImageClick = (img: string) => {
    setShowImageModal(true);
    setModalImage(img);
  };
  const closeModal = () => {
    setShowImageModal(false);
    setModalImage(null);
  };

  // if (loading) {
  //   return (
  //     <div className="container px-4 py-8 flex justify-center items-center min-h-[50vh]">
  //       <p>Loading restaurant information...</p>
  //     </div>
  //   )
  // }

  if (loading) {
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

  if (error || !restaurant) {
    return (
      <div className="container px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Restaurant not found</h1>
        <p>Sorry, we couldn't find the restaurant you're looking for.</p>
        <p className="text-sm text-gray-500 mt-2">Error: {error || "Unknown error"}</p>
        <Button asChild className="mt-4">
          <a href="/restaurants">Browse Restaurants</a>
        </Button>
      </div>
    )
  }

  const cuisines = restaurant.category?.map((c: any) => c.name) || []
  const heroImage = restaurant.imageUrl || "/placeholder.svg"
  const fullAddress = restaurant.address || "Address not available"
  const phone = restaurant.phone || "Phone not available"
  const membersUsed = 1274
  const offers = restaurant.offers || []

  return (
    <div className="min-h-screen bg-soft-bg bg-gray-50">
      <RedeemAnimation isVisible={redeemError} onComplete={() => setRedeemError(false)} />

      <div className="relative h-56 animate-in fade-in duration-500 overflow-hidden">
        <img
          src={heroImage}
          alt={restaurant.name}
          className="w-full h-full object-cover transition-transform duration-[3000ms] hover:scale-105"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent transition-opacity duration-300"
          style={{ opacity: heroOverlayOpacity }}
        />
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

      <div className="bg-white border-t border-lines">
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-center gap-3 text-xs text-[#64748B]">
            <div className="flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5" />
              <span className="font-medium">400+ venues</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <PiggyBank className="h-3.5 w-3.5" />
              <span className="font-medium">Save 100's</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-soft-bg px-4 py-4 bg-gray-50">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="flex flex-col items-center gap-1">
            <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-xs text-dark-ink font-medium">Cancel anytime</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-xs text-dark-ink font-medium">Hundreds of venues</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Gift className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-xs text-dark-ink font-medium">Save £100s / year</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                isLoading={redeemLoadingId}
                style={{ animationDelay: `${index * 100}ms` }}
              />
            </div>
          ))}
          {!isAuthenticated && (
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
              </Card>

              <Card
                className="rounded-2xl shadow-md border-lines p-6 bg-[#F8FAFC] animate-in fade-in duration-700"
                style={{ animationDelay: "400ms" }}
              >
                <h3
                  className="text-lg font-bold text-dark-ink mb-4 text-center"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  What members say
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {visibleTestimonials.map((testimonial, index) => (
                    <div
                      key={`${currentTestimonialIndex}-${index}`}
                      className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom duration-500"
                    >
                      <img
                        src={testimonial.avatar || "/placeholder.svg"}
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full flex-shrink-0 object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-dark-ink italic">"{testimonial.quote}"</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {testimonial.name}, {testimonial.location}
                        </p>
                        <div className="flex gap-0.5 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className="text-amber-400 text-sm">★</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
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
                    className="object-cover"
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
            {!restaurant.galleryImages || restaurant.galleryImages.length === 0 && (
              <div className="col-span-3 text-center py-8">
                <p className="text-muted-foreground">No gallery images available.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {showImageModal && modalImage && (
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
            <img
              src={modalImage}
              alt="Full Size"
              className="w-full h-auto rounded-lg shadow-lg"
              style={{ maxHeight: "90vh", objectFit: "contain" }}
            />
          </div>
        </div>
      )}
    </div>
  )
}