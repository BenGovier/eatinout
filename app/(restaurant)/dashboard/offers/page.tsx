"use client"

import { useEffect, useState, useCallback,useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MoreHorizontal, PlusCircle, Copy, Check, Sparkles, CreditCard, CheckCircle2, Zap, Gift, ArrowLeft, ArrowRight } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { toast } from "react-toastify"
import {
  OfferWizardStep1,
  OfferWizardStep2,
  OfferWizardStep3,
  OfferWizardStep4,
  OfferWizardStep5,
} from "@/components/offers"

interface Offer {
  id: string
  title: string
  restaurantName: string
  restaurantId: string
  restaurantSlug: string | null
  offerSlug: string
  status: string
  redemptions: number
  validDays: string
  startDate: string
  expiryDate: string | null
  description?: string
  offerType?: string
  discountPercentage?: number | null
}

interface SubscriptionInfo {
  status: string
  hasActiveSubscription: boolean
}

interface Tag {
  _id: string
  name: string
  slug?: string
}

interface ValidDays {
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
}
type Category = {
  _id?: string
  id?: string
  name: string
}
const weekOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function getOrderedValidDays(validDays: string) {
  if (!validDays || validDays.trim() === "") return "N/A"
  if (validDays.trim().toLowerCase() === "all week") return "All week"
  const daysArray = validDays.split(",").map(day => day.trim())
  const ordered = weekOrder.filter(day => daysArray.includes(day))
  return ordered.join(", ")
}

function formatLocalDateTime(dateString: string | null | undefined) {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ""
  // Use user's local timezone instead of UK timezone
  return date.toLocaleString(undefined, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  })
}

// Convert UTC date to local datetime-local format (YYYY-MM-DDTHH:mm)
function convertToLocalDateTimeLocal(utcDateString: string | null | undefined): string {
  if (!utcDateString) return ""
  const date = new Date(utcDateString)
  if (isNaN(date.getTime())) return ""

  // Get local date components
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function OffersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, hasNextPage: false })
  const [subscription, setSubscription] = useState<SubscriptionInfo>({ status: "inactive", hasActiveSubscription: false })
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false)
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [copiedOfferId, setCopiedOfferId] = useState<string | null>(null)
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [isFirstOffer, setIsFirstOffer] = useState(false)

  // Wizard state
  const [showWizard, setShowWizard] = useState(false)
  const [wizardMode, setWizardMode] = useState<"create" | "edit" | "duplicate">("create")
  const [wizardStep, setWizardStep] = useState(1)
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  // Form state - matching reference design exactly
  const [restaurantId, setRestaurantId] = useState("")
  // const [offerType, setOfferType] = useState<"" | "discount" | "bogo">("")
  const [offerType, setOfferType] = useState<"" | "discount" | "bogo" | "freeItem" | "other">("")
  const [discountPercentage, setDiscountPercentage] = useState("")
  const [freeItemName, setFreeItemName] = useState("")           // ← ADD
  const [otherOfferDescription, setOtherOfferDescription] = useState("")  // ← ADD
  const [offerTitle, setOfferTitle] = useState("")
  const [offerDescription, setOfferDescription] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [rawTags, setRawTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState("")
  const [isUnlimited, setIsUnlimited] = useState(true)
  const [redemptionLimit, setRedemptionLimit] = useState("")
  const [redemptionResetPeriod, setRedemptionResetPeriod] = useState<"none" | "weekly" | "monthly">("none")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [runUntilFurtherNotice, setRunUntilFurtherNotice] = useState(false)
  const [validAllWeek, setValidAllWeek] = useState(true)
  
  const [validDays, setValidDays] = useState<ValidDays>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  })
  const [dineIn, setDineIn] = useState(true)
  const [takeaway, setTakeaway] = useState(false)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [bookingType, setBookingType] = useState<"mandatory" | "recommended" | "not-needed">("recommended")
  const [terms, setTerms] = useState("")
  const [confirmed, setConfirmed] = useState(false)

  const totalSteps = 5
  const progress = (wizardStep / totalSteps) * 100

  useEffect(() => {
    document.title = "Offers"
  }, [])

  // Handle subscription success
  useEffect(() => {
    const subscriptionParam = searchParams.get("subscription")
    const sessionId = searchParams.get("session_id")

    if (subscriptionParam === "success" && sessionId) {
      verifySubscription(sessionId)
    } else if (subscriptionParam === "cancelled") {
      // toast.info("Subscription cancelled")
      router.replace("/dashboard/offers")
    }
  }, [searchParams, router])

  const verifySubscription = async (sessionId: string) => {
    try {
      const restaurantRes = await fetch("/api/restaurant/offers/restaurant")
      const restaurantData = await restaurantRes.json()
      const restaurantIdFromApi = restaurantData?.restaurants?.[0]?._id

      if (!restaurantIdFromApi) {
        toast.error("Restaurant not found. Please try again.")
        router.replace("/dashboard/offers")
        return
      }

      const response = await fetch("/api/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify-subscription",
          sessionId,
          restaurantId: restaurantIdFromApi,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Subscription activated successfully!")
        setSubscription({ status: "active", hasActiveSubscription: true })
        router.replace("/dashboard/offers")
      } else {
        console.error("Verification failed:", data)
        toast.error(data.message || "Failed to verify subscription. Please contact support.")
        router.replace("/dashboard/offers")
      }
    } catch (error: any) {
      console.error("Error verifying subscription:", error)
      toast.error("An error occurred while verifying your subscription. Please contact support.")
      router.replace("/dashboard/offers")
    }
  }

  const normalizeTags = useCallback((tags: Array<string | { _id?: string; id?: string; name?: string }>, availableCategories: Category[]) => {
    if (!tags || tags.length === 0) return []
    const categoryIdSet = new Set(availableCategories.map((category) => category._id))
    const categoryNameToId = new Map(
      availableCategories.map((category) => [category.name.toLowerCase(), category._id])
    )

    return tags
      .map((tag) => {
        if (typeof tag === "string") return tag
        return tag?._id || tag?.id || tag?.name || ""
      })
      .filter(Boolean)
      .map((tag) => {
        if (categoryIdSet.has(tag)) return tag
        const match = categoryNameToId.get(String(tag).toLowerCase())
        return match || tag
      })
  }, [])

  const fetchOffers = useCallback(async (page = 1, append = false) => {
    try {
      if (page === 1) setLoading(true)
      else setLoadingMore(true)

      const response = await fetch(`/api/restaurant/offers?page=${page}&limit=10`)
      if (!response.ok) throw new Error("Failed to fetch offers")

      const data = await response.json()

      const formattedOffers = data.offers.map((offer: any) => ({
        id: offer.id,
        title: offer.title,
        description: offer.description,
        restaurantName: offer.restaurantName,
        restaurantId: offer.restaurantId,
        restaurantSlug: offer.restaurantSlug || null,
        offerSlug: offer.offerSlug || "",
        status: offer.status === "pending" ? "inactive" : offer.status, // Map pending to inactive
        redemptions: offer.redeemCount,
        validDays: offer.validDays,
        startDate: offer.startDate,
        expiryDate: offer.expiryDate ?? null,
        offerType: offer.offerType,
        discountPercentage: offer.discountPercentage ?? null,
      }))

      setOffers(prev => append ? [...prev, ...formattedOffers] : formattedOffers)

      setPagination({
        page: data.pagination.page,
        totalPages: data.pagination.totalPages,
        hasNextPage: data.pagination.page < data.pagination.totalPages,
      })

      if (data.subscription) {
        setSubscription(data.subscription)
      }
      setSubscriptionLoaded(true)

    } catch (error) {
      console.error("Error fetching offers:", error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  const fetchRestaurants = useCallback(async () => {
    try {
      const response = await fetch("/api/restaurant/offers/restaurant")
      const data = await response.json()
      if (data?.restaurants) {
        setRestaurants(data.restaurants)
        if (data.restaurants.length === 1) {
          setRestaurantId(data.restaurants[0]._id)
          // Check if this is the first offer for this restaurant
          await checkIfFirstOffer(data.restaurants[0]._id)
        }
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error)
    }
  }, [])

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/tags")
      const data = await response.json()
      if (data?.success && data?.tags) {
        setAllTags(data.tags)
      }
    } catch (error) {
      console.error("Error fetching tags:", error)
    }
  }, [])

  // New function to check if this is the first offer for a restaurant
  const checkIfFirstOffer = async (selectedRestaurantId: string) => {
    if (!selectedRestaurantId) {
      setIsFirstOffer(false)
      return
    }

    try {
      const response = await fetch(`/api/restaurant/offers/check-existing?restaurantId=${selectedRestaurantId}`)
      if (!response.ok) throw new Error("Failed to check existing offers")

      const data = await response.json()
      setIsFirstOffer(!data.hasExistingOffers)

      // If it's the first offer, automatically set runUntilFurtherNotice to true
      if (!data.hasExistingOffers && wizardMode === "create") {
        setRunUntilFurtherNotice(true)
        setEndDate("")
      }
    } catch (error) {
      console.error("Error checking existing offers:", error)
      setIsFirstOffer(false)
    }
  }

  // Watch for restaurant ID changes to check first offer status
  useEffect(() => {
    if (restaurantId && showWizard && wizardMode === "create") {
      checkIfFirstOffer(restaurantId)
    }
  }, [restaurantId, showWizard, wizardMode])

  useEffect(() => {
    fetchOffers()
    fetchRestaurants()
    fetchTags()
  }, [fetchOffers, fetchRestaurants, fetchTags])

  useEffect(() => {
    if (rawTags.length > 0 && allTags.length > 0) {
      setSelectedTags(normalizeTags(rawTags, allTags))
    }
  }, [rawTags, allTags, normalizeTags])

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 200 &&
        pagination.hasNextPage &&
        !loadingMore &&
        !loading
      ) {
        fetchOffers(pagination.page + 1, true)
      }
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [pagination, loading, loadingMore, fetchOffers])

  // const handleToggleStatus = async (id: string, currentStatus: string) => {
  //   try {
  //     const response = await fetch(`/api/restaurant/offers/${id}/status`, {
  //       method: "PUT",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ status: currentStatus }),
  //     })

  //     if (!response.ok) {
  //       const errorData = await response.json()
  //       throw new Error(errorData.message || "Failed to update offer status")
  //     }

  //     toast.success(currentStatus === "inactive" ? "Offer deactivated successfully" : "Offer activated successfully")

  //     setOffers(prev =>
  //       prev.map(offer =>
  //         offer.id === id ? { ...offer, status: currentStatus } : offer
  //       )
  //     )
  //   } catch (error: any) {
  //     console.error("Error updating offer status:", error)
  //     toast.error(error.message || "Failed to update offer status. Please try again.")
  //   }
  // }

  const handleShareOffer = async (restaurantSlug: string | null, offerSlug: string, restaurantIdParam: string, offerId: string) => {
    try {
      const shareUrl = restaurantSlug && offerSlug
        ? `${window.location.origin}/restaurant/${restaurantSlug}?offer=${offerSlug}`
        : `${window.location.origin}/restaurant/${restaurantIdParam}?offerId=${offerId}`
      await navigator.clipboard.writeText(shareUrl)
      setCopiedOfferId(offerId)
      toast.success("Share link copied to clipboard!")
      setTimeout(() => setCopiedOfferId(null), 2000)
    } catch (error) {
      console.error("Error copying link:", error)
      toast.error("Failed to copy link. Please try again.")
    }
  }

  const resetWizard = useCallback(() => {
    setWizardStep(1)
    setEditingOfferId(null)
    setRestaurantId(restaurants.length === 1 ? restaurants[0]._id : "")
    setOfferType("")
    setDiscountPercentage("")
    setOfferTitle("")
    setOfferDescription("")
    setSelectedTags([])
    setCustomTag("")
    setIsUnlimited(true)
    setRedemptionLimit("")
    setRedemptionResetPeriod("none")
    setStartDate("")
    setEndDate("")
    setRunUntilFurtherNotice(false)
    setValidAllWeek(true)
    setValidDays({
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    })
    setDineIn(true)
    setTakeaway(false)
    setStartTime("")
    setEndTime("")
    setBookingType("recommended")
    setTerms("")
    setConfirmed(false)
    setIsFirstOffer(false)
  }, [restaurants])

  const ensureSubscriptionStatus = async () => {
    if (!subscriptionLoaded) {
      await fetchOffers(1, false)
    }
  }

  const hasActiveSubscription = subscription.hasActiveSubscription || subscription.status === "active"

  const handleCreateOffer = async () => {
    await ensureSubscriptionStatus()
    if (!hasActiveSubscription) {
      setShowSubscriptionDialog(true)
    } else {
      resetWizard()
      setWizardMode("create")
      setShowWizard(true)
    }
  }

  const handleEditOffer = async (offerId: string) => {
    resetWizard()
    setWizardMode("edit")
    setEditingOfferId(offerId)
    await loadOfferData(offerId)
    setShowWizard(true)
  }

  const handleDuplicateOffer = async (offerId: string) => {
    // Remove subscription check - don't show subscription dialog
    resetWizard()
    setWizardMode("duplicate")
    setEditingOfferId(offerId)
    await loadOfferData(offerId, true)
    setShowWizard(true)
  }

  const loadOfferData = async (id: string, isDuplicate = false) => {
    try {
      const response = await fetch(`/api/restaurant/offers/${id}`)
      if (!response.ok) throw new Error("Failed to fetch offer data")
      const data = await response.json()

      setRestaurantId(data.restaurantId)

      // Map API offerType to form format
      // NAYA CODE - sab 4 types handle karta hai
      const formOfferType =
        data.offerType === "2for1" ? "bogo" :
          data.offerType === "percentOff" ? "discount" :
            data.offerType === "freeItem" ? "freeItem" :
              data.offerType === "other" ? "other" : ""
      setOfferType(formOfferType as "" | "discount" | "bogo" | "freeItem" | "other")
      const discountValue = data.discountPercentage ?? data.discount ?? data.discountAmount
      setDiscountPercentage(discountValue !== undefined && discountValue !== null ? String(discountValue) : "")
      setFreeItemName(data.freeItemName || "")
      setOtherOfferDescription(data.otherOfferDescription || "")
      setOfferTitle(data.title)
      setOfferDescription(data.description)

      if (data.tags) {
        const tags = Array.isArray(data.tags) ? data.tags : JSON.parse(data.tags || "[]")
        const tagIds = tags.map((tag: any) => {
          if (typeof tag === "string") return tag
          return tag?._id || tag?.id || ""
        }).filter(Boolean)
        setSelectedTags(tagIds)
      }

      setIsUnlimited(data.isUnlimited ?? true)
      setRedemptionLimit(data.maxRedemptionLimit?.toString() || "")
      setRedemptionResetPeriod((data.recurringType || "none") as "none" | "weekly" | "monthly")

      if (data.startDate) {
        setStartDate(convertToLocalDateTimeLocal(data.startDate))
      }

      // For duplicate mode, don't set expiry date - keep it empty
      if (isDuplicate) {
        setRunUntilFurtherNotice(false)
        setEndDate("")
      } else {
        setRunUntilFurtherNotice(data.runUntilFurther ?? false)
        if (data.expiryDate && !data.runUntilFurther) {
          setEndDate(convertToLocalDateTimeLocal(data.expiryDate))
        }
      }

      // Parse valid days
      if (data.validDays?.toLowerCase() === "all week") {
        setValidAllWeek(true)
        setValidDays({
          monday: false, tuesday: false, wednesday: false, thursday: false,
          friday: false, saturday: false, sunday: false,
        })
      } else {
        setValidAllWeek(false)
        const daysArray = data.validDays?.toLowerCase().split(", ") || []
        setValidDays({
          monday: daysArray.includes("monday"),
          tuesday: daysArray.includes("tuesday"),
          wednesday: daysArray.includes("wednesday"),
          thursday: daysArray.includes("thursday"),
          friday: daysArray.includes("friday"),
          saturday: daysArray.includes("saturday"),
          sunday: daysArray.includes("sunday"),
        })
      }

      setDineIn(data.dineIn ?? true)
      setTakeaway(data.dineOut ?? false)

      const [start, end] = data.validHours?.split(" - ") || ["", ""]
      setStartTime(start)
      setEndTime(end)

      const bookingReq = data.bookingRequirement === "notNeeded" ? "not-needed" : data.bookingRequirement || "recommended"
      setBookingType(bookingReq as "mandatory" | "recommended" | "not-needed")
      setTerms(data.terms || "")
      setConfirmed(true)
    } catch (error) {
      console.error("Error loading offer data:", error)
      toast.error("Failed to load offer data")
      setShowWizard(false)
    }
  }

  const handleSubscribe = async () => {
    try {
      setIsSubscribing(true)
      const restaurantIdForSub = restaurants[0]?._id

      if (!restaurantIdForSub) {
        toast.error("No restaurant found")
        return
      }

      const response = await fetch("/api/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-subscription-checkout",
          restaurantId: restaurantIdForSub,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("Failed to create checkout session")
      }
    } catch (error) {
      console.error("Error starting subscription:", error)
      toast.error("Failed to start subscription. Please try again.")
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleStartFreeOffer = () => {
    setShowSubscriptionDialog(false)
    resetWizard()
    setWizardMode("create")
    setShowWizard(true)
  }

  // Tag handlers
  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(t => t !== tagId)
      }
      // if (prev.length >= 6) {
      //   toast.warning("Maximum 6 tags allowed")
      //   return prev
      // }
      return [...prev, tagId]
    })
  }

  const addCustomTag = async (tagName: string) => {
    const name = tagName.trim()
    if (!name) return

    const existing = allTags.find((tag) => tag.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      setSelectedTags((prev) => {
        if (prev.includes(existing._id)) return prev
        // if (prev.length >= 6) {
        //   toast.warning("Maximum 6 tags allowed")
        //   return prev
        // }
        return [...prev, existing._id]
      })
      setCustomTag("")
      return
    }

    try {
      const response = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isActive: true }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to add tag")
      }

      const data = await response.json()
      const newTag = {
        _id: data.tag._id,
        name: data.tag.name,
      }

      setAllTags((prev) => {
        const exists = prev.some(tag => tag._id === newTag._id || tag.name.toLowerCase() === newTag.name.toLowerCase())
        if (exists) return prev
        return [...prev, newTag]
      })

      setSelectedTags((prev) => {
        if (prev.includes(newTag._id)) return prev
        // if (prev.length >= 6) {
        //   toast.warning("Maximum 6 tags allowed")
        //   return prev
        // }
        return [...prev, newTag._id]
      })

      setCustomTag("")
      toast.success("Tag added successfully!")
    } catch (error: any) {
      console.error("Error adding tag:", error)
      toast.error(error.message || "Failed to add tag")
    }
  }


  const removeTag = (tagId: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tagId))
  }

  const checkRequiresPremium = () => {
    if (subscription.hasActiveSubscription) return false
    if (offerType === "bogo") return true
    if (offerType === "discount") {
      const discount = Number(discountPercentage)
      if (!discountPercentage || isNaN(discount)) return false
      if (discount < 25) return true
    }
    return false
  }

  const requiresPremium = checkRequiresPremium()

  const canProceedStep1 = restaurantId && offerType && (
    offerType === "bogo" ||
    (offerType === "discount" && discountPercentage) ||
    // (offerType === "freeItem" && freeItemName.trim()) ||
    offerType === "freeItem" ||
    (offerType === "other" && otherOfferDescription.trim())
  )
  const canProceedStep2 = offerTitle.trim() && offerDescription.trim()
  // For first offer, we don't need end date validation since it's disabled
  const canProceedStep3 = isFirstOffer && wizardMode === "create"
    ? (isUnlimited || redemptionLimit) && startDate
    : (isUnlimited || redemptionLimit) && startDate && (runUntilFurtherNotice || endDate)
  const canProceedStep4 = (() => {
    const hasValidDays = validAllWeek || Object.values(validDays).some(day => day)
    const hasValidTimes = startTime && endTime && startTime < endTime
    const hasBooking = !!bookingType
    return hasValidDays && (dineIn || takeaway) && hasValidTimes && hasBooking
  })()
  const canProceedStep5 = terms.trim() && confirmed

  const canProceed =
    (wizardStep === 1 && canProceedStep1) ||
    (wizardStep === 2 && canProceedStep2) ||
    (wizardStep === 3 && canProceedStep3) ||
    (wizardStep === 4 && canProceedStep4) ||
    (wizardStep === 5 && canProceedStep5)

  const handleWizardBack = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1)
  }

  const handleWizardNext = () => {
    if (wizardStep < totalSteps) setWizardStep(wizardStep + 1)
    else handleWizardSubmit()
  }

  const handleWizardSubmit = async () => {
    setIsSubmitting(true)

    try {
      const validDaysArray = validAllWeek
        ? ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        : Object.entries(validDays).filter(([_, isValid]) => isValid).map(([day]) => day)

      const validDaysStr = validAllWeek
        ? "All week"
        : validDaysArray.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(", ")

      const validHours = `${startTime} - ${endTime}`

      const apiOfferType =
        offerType === "discount" ? "percentOff" :
          offerType === "bogo" ? "2for1" :
            offerType === "freeItem" ? "freeItem" :
              offerType === "other" ? "other" : offerType

      const now = new Date()
      const offerStart = startDate ? new Date(startDate) : null
      let status = "inactive"

      if (offerStart) {
        if (offerStart <= now) {
          if (isFirstOffer && wizardMode === "create") {
            status = "active"
          } else if (runUntilFurtherNotice || !endDate) {
            status = "active"
          } else {
            const offerEnd = new Date(endDate)
            if (offerEnd > now) {
              status = "active"
            } else {
              status = "expired"
            }
          }
        } else {
          status = "inactive"
        }
      }

      const recurringType = isUnlimited || redemptionResetPeriod === "none" ? null : redemptionResetPeriod

      const payload: any = {
        title: offerTitle,
        description: offerDescription,
        offerType: apiOfferType,
        discountPercentage: offerType === "discount" ? parseInt(discountPercentage) : null,
        freeItemName: offerType === "freeItem" ? freeItemName.trim() : null,  // ← Make sure to trim
        otherOfferDescription: offerType === "other" ? otherOfferDescription.trim() : null,  // ← Make sure to trim
        validDays: validDaysStr,
        validHours: validHours,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        expiryDate: (isFirstOffer && wizardMode === "create") ? null : (runUntilFurtherNotice ? null : (endDate ? new Date(endDate).toISOString() : null)),
        terms: terms.trim(),
        dineIn: dineIn,
        dineOut: takeaway,
        restaurantId: restaurantId,
        status: status,
        runUntilFurther: (isFirstOffer && wizardMode === "create") ? true : runUntilFurtherNotice,
        bookingRequirement: bookingType === "not-needed" ? "notNeeded" : bookingType,
        maxRedemptionLimit: isUnlimited ? null : redemptionLimit,
        isUnlimited: isUnlimited,
        recurringType: recurringType,
        recurringStartDate: recurringType ? new Date() : null,
        tags: selectedTags,
      }

      // Only add ID for edit mode, not duplicate
      if (wizardMode === "edit" && editingOfferId) {
        payload.id = editingOfferId
      }

      // For both create and duplicate, use POST. Only edit uses PUT.
      const response = await fetch("/api/restaurant/offers", {
        method: wizardMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `Failed to ${wizardMode} offer`)
      }

      toast.success(wizardMode === "edit" ? "Offer updated successfully" : wizardMode === "duplicate" ? "Offer duplicated successfully" : "Offer created successfully")
      setShowWizard(false)
      resetWizard()
      fetchOffers()
    } catch (error: any) {
      toast.error(error.message || `Failed to ${wizardMode} offer`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getWizardTitle = () => {
    switch (wizardMode) {
      case "edit": return "Edit Offer"
      case "duplicate": return "Create Your Exclusive Offer"
      default: return "Create Your Exclusive Offer"
    }
  }

  const getRestaurantName = () => {
    return restaurants.find(r => r._id === restaurantId)?.name || ""
  }

  // Handler for restaurant change in Step 1
  const handleRestaurantChange = async (value: string) => {
    setRestaurantId(value)
    // Check if this is the first offer when restaurant changes
    if (wizardMode === "create") {
      await checkIfFirstOffer(value)
    }
  }
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0
    }
  }, [wizardStep])
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 lg:gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold">Manage Offers</h1>
        <Button onClick={handleCreateOffer} className="bg-[#E31E24] hover:bg-[#C01A1F] w-full sm:w-auto">
          <Sparkles className="mr-2 h-4 w-4" />
          Create New Offer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg lg:text-xl">Your Offers</CardTitle>
          <CardDescription className="text-xs lg:text-sm">View and manage your restaurant offers</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 lg:p-6">
                    <div className="space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-48"></div>
                      <div className="h-4 bg-gray-200 rounded w-full max-w-md"></div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && offers.length > 0 && (
            <div className="space-y-3 lg:space-y-4">
              {offers.map((offer) => (
                <Card key={offer.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex-1">
                        <div className="mb-3 lg:mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="text-base lg:text-lg font-semibold">{offer.title}</h3>
                          <Badge
                            variant={offer.status === "active" ? "outline" : offer.status === "inactive" ? "secondary" : "destructive"}
                            className={
                              offer.status === "active"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : offer.status === "inactive"
                                  ? "bg-gray-50 text-gray-700 border-gray-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                            }
                          >
                            {offer.status === "active" ? "Active" : offer.status === "inactive" ? "Inactive" : offer.status === "expired" ? "Expired" : "Inactive"}
                          </Badge>
                        </div>

                        {offer.description && (
                          <p className="mb-3 lg:mb-4 text-xs lg:text-sm text-muted-foreground line-clamp-2">{offer.description}</p>
                        )}

                        <div className="grid gap-2 lg:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-lg bg-primary/10">
                              <span className="text-xs lg:text-sm font-bold text-primary">
                                {/* {offer.offerType === "2for1" ? "2×1" : offer.offerType === "percentOff" ? "%" : "🎁"} */}
                                {
                                  offer.offerType === "2for1"
                                    ? "2×1"
                                    : offer.offerType === "percentOff"
                                      ? "%"
                                      : offer.offerType === "freeItem"
                                        ? "🆓"
                                        : offer.offerType === "other"
                                          ? "✨"
                                          : "🎁"
                                }
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Type</p>
                              <p className="text-xs lg:text-sm font-medium capitalize">
                                {offer.offerType === "2for1" ? "2 for 1" : offer.offerType === "percentOff" ? (offer.discountPercentage ? `${offer.discountPercentage}% Off` : "% Off") : offer.offerType || "Custom"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <div className="h-4 w-4 text-muted-foreground">📅</div>
                            <div>
                              <p className="text-xs text-muted-foreground">Expires</p>
                              <p className="text-xs lg:text-sm font-medium">
                                {offer.expiryDate ? formatLocalDateTime(offer.expiryDate) : "Until Further Notice"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <div className="h-4 w-4 text-muted-foreground">🕒</div>
                            <div>
                              <p className="text-xs text-muted-foreground">Valid Days</p>
                              <p className="text-xs lg:text-sm font-medium">{getOrderedValidDays(offer.validDays)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <div className="h-4 w-4 text-muted-foreground">📍</div>
                            <div>
                              <p className="text-xs text-muted-foreground">Redemptions</p>
                              <p className="text-xs lg:text-sm font-medium">{offer.redemptions}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">Restaurant: {offer.restaurantName}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleShareOffer(offer.restaurantSlug, offer.offerSlug, offer.restaurantId, offer.id)}
                                className="shrink-0"
                              >
                                {copiedOfferId === offer.id ? (
                                  <>
                                    <Check className="mr-2 h-3 w-3 lg:h-4 lg:w-4" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="mr-2 h-3 w-3 lg:h-4 lg:w-4" />
                                    Copy Link
                                  </>
                                )}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditOffer(offer.id)}>
                                    Edit Offer
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicateOffer(offer.id)}>
                                    Duplicate Offer
                                  </DropdownMenuItem>
                                  {/* {offer.status === "active" ? (
                                    <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => handleToggleStatus(offer.id, "inactive")}>
                                      Deactivate
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem className="text-green-600 cursor-pointer" onClick={() => handleToggleStatus(offer.id, "active")}>
                                      Reactivate
                                    </DropdownMenuItem>
                                  )} */}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {loadingMore && (
                <div className="space-y-4 mt-2">
                  {[1, 2].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4 lg:p-6">
                        <div className="space-y-3">
                          <div className="h-5 bg-gray-200 rounded w-48"></div>
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && offers.length === 0 && (
            <div className="py-12 lg:py-16 text-center px-4">
              <p className="mb-2 text-base lg:text-lg text-muted-foreground">You haven't created any offers yet.</p>
              <p className="text-xs lg:text-sm text-muted-foreground mb-4 lg:mb-6">
                Create your first offer to attract customers!
              </p>
              <Button onClick={handleCreateOffer} className="bg-[#E31E24] hover:bg-[#C01A1F] w-full sm:w-auto">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create New Offer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Dialog */}
      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl lg:text-3xl font-bold">Choose Your Plan</DialogTitle>
            <DialogDescription className="text-center">
              Subscribe to create and manage your restaurant offers
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:gap-6 md:grid-cols-2">
            {/* Premium Free Option */}
            <div className="relative flex flex-col rounded-xl border-2 border-[#E31E24] bg-gradient-to-br from-red-50 to-red-100 p-4 lg:p-6">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-[#E31E24] px-3 lg:px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  RECOMMENDED
                </span>
              </div>

              <div className="mb-4 lg:mb-6 flex items-center gap-3 mt-2">
                <div className="flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-full bg-[#E31E24] text-white">
                  <Sparkles className="h-5 w-5 lg:h-6 lg:w-6" />
                </div>
                <div>
                  <p className="text-lg lg:text-xl font-bold text-[#E31E24]">Exclusive Free</p>
                </div>
              </div>

              <div className="mb-4 lg:mb-6 flex-1 space-y-2 lg:space-y-3">
                <div className="flex items-start gap-2 lg:gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-green-600" />
                  <p className="text-xs lg:text-sm"><strong>1 exclusive offer</strong> (25%+ off or 2 for 1)</p>
                </div>
                <div className="flex items-start gap-2 lg:gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-green-600" />
                  <p className="text-xs lg:text-sm"><strong>Unlimited offers</strong> after exclusive is live</p>
                </div>
                <div className="flex items-start gap-2 lg:gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-green-600" />
                  <p className="text-xs lg:text-sm"><strong>Thousands of hungry customers</strong></p>
                </div>
                <div className="flex items-start gap-2 lg:gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-green-600" />
                  <p className="text-xs lg:text-sm"><strong>Premium placement</strong> in search results</p>
                </div>
              </div>

              <Button onClick={handleStartFreeOffer} size="lg" className="w-full bg-[#E31E24] hover:bg-[#C01A1F]">
                <Sparkles className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
                Get Started Free
              </Button>

              {/* <p className="mt-2 lg:mt-3 text-center text-xs text-muted-foreground">Must be exclusive to EATINOUT only</p> */}
            </div>

            {/* Paid Standard Option */}
            <div className="flex flex-col rounded-xl border-2 border-border bg-card p-4 lg:p-6">
              <div className="mb-4 lg:mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-full bg-muted">
                  <Zap className="h-5 w-5 lg:h-6 lg:w-6" />
                </div>
                <div>
                  <h3 className="text-lg lg:text-xl font-bold">Standard Listing</h3>
                  <p className="text-lg lg:text-xl font-bold">
                    £24.99<span className="text-sm font-normal text-muted-foreground"> /month</span>
                  </p>
                </div>
              </div>

              <div className="mb-4 lg:mb-6 flex-1 space-y-2 lg:space-y-3">
                <div className="flex items-start gap-2 lg:gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-muted-foreground" />
                  <p className="text-xs lg:text-sm">List <strong>any offers</strong> you want</p>
                </div>
                <div className="flex items-start gap-2 lg:gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-muted-foreground" />
                  <p className="text-xs lg:text-sm"><strong>No exclusivity required</strong></p>
                </div>
                <div className="flex items-start gap-2 lg:gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-muted-foreground" />
                  <p className="text-xs lg:text-sm">Use existing menu deals</p>
                </div>
                <div className="flex items-start gap-2 lg:gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-muted-foreground" />
                  <p className="text-xs lg:text-sm">Standard placement</p>
                </div>
                <div className="flex items-start gap-2 lg:gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-muted-foreground" />
                  <p className="text-xs lg:text-sm">Cancel anytime</p>
                </div>
              </div>

              <Button
                onClick={handleSubscribe}
                variant="outline"
                size="lg"
                className="w-full bg-transparent"
                disabled={isSubscribing}
              >
                <CreditCard className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
                {isSubscribing ? "Loading..." : "Subscribe"}
              </Button>

              <p className="mt-2 lg:mt-3 text-center text-xs text-muted-foreground">Billed monthly, cancel anytime</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Offer Wizard Dialog */}
      <Dialog open={showWizard} onOpenChange={(open) => { if (!open) setShowWizard(false) }}>
        <DialogContent ref={contentRef} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E31E24] text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle>{getWizardTitle()}</DialogTitle>
                  <DialogDescription>
                    Step {wizardStep} of {totalSteps}
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-[#E31E24] text-[#E31E24]">
                <Gift className="mr-1 h-3 w-3" />
                {wizardMode === "edit" ? "Editing" : wizardMode === "duplicate" ? "Duplicating" : "Exclusive"}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </DialogHeader>

          <div className="min-h-[400px] py-6">
            {wizardStep === 1 && (
              <OfferWizardStep1
                restaurantId={restaurantId}
                offerType={offerType}
                discountPercentage={discountPercentage}
                freeItemName={freeItemName}
                otherOfferDescription={otherOfferDescription}
                restaurants={restaurants}
                hasActiveSubscription={subscription.hasActiveSubscription}
                onRestaurantChange={handleRestaurantChange}
                onOfferTypeChange={(value) => {
                  setOfferType(value as "" | "discount" | "bogo" | "freeItem" | "other")
                  console.log('Offer type changed to:', value)
                }}
                onDiscountChange={setDiscountPercentage}
                onFreeItemChange={(value) => {
                  setFreeItemName(value)
                  console.log('Free item name:', value)
                }}
                onOtherOfferDescriptionChange={(value) => {
                  setOtherOfferDescription(value)
                  console.log('Other offer description:', value)
                }}
                onUpgradeToPaid={handleSubscribe}
              />
            )}

            {wizardStep === 2 && (
              <OfferWizardStep2
                title={offerTitle}
                description={offerDescription}
                selectedTags={selectedTags}
                customTag={customTag}
                categories={allTags}
                onTitleChange={setOfferTitle}
                onDescriptionChange={setOfferDescription}
                onToggleTag={toggleTag}
                onRemoveTag={removeTag}
                onCustomTagChange={setCustomTag}
                onAddCustomTag={addCustomTag}
              />
            )}

            {wizardStep === 3 && (
              <OfferWizardStep3
                isUnlimited={isUnlimited}
                redemptionLimit={redemptionLimit}
                redemptionResetPeriod={redemptionResetPeriod}
                startDate={startDate}
                endDate={endDate}
                runUntilFurtherNotice={runUntilFurtherNotice}
                isFirstOffer={isFirstOffer && wizardMode === "create"}
                onUnlimitedChange={(checked) => {
                  setIsUnlimited(checked)
                  if (checked) {
                    setRedemptionLimit("")
                    setRedemptionResetPeriod("none")
                  }
                }}
                onRedemptionLimitChange={setRedemptionLimit}
                onResetPeriodChange={setRedemptionResetPeriod}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onRunUntilFurtherNoticeChange={(checked) => {
                  setRunUntilFurtherNotice(checked)
                  if (checked) {
                    setEndDate("")
                  }
                }}
              />
            )}

            {wizardStep === 4 && (
              <OfferWizardStep4
                validAllWeek={validAllWeek}
                validDays={validDays}
                dineIn={dineIn}
                takeaway={takeaway}
                startTime={startTime}
                endTime={endTime}
                bookingType={bookingType}
                onValidAllWeekChange={(checked) => {
                  setValidAllWeek(checked)
                  if (checked) {
                    setValidDays({
                      monday: false, tuesday: false, wednesday: false, thursday: false,
                      friday: false, saturday: false, sunday: false,
                    })
                  }
                }}
                onValidDayChange={(day, checked) => {
                  setValidDays(prev => ({ ...prev, [day]: checked }))
                }}
                onDineInChange={setDineIn}
                onTakeawayChange={setTakeaway}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
                onBookingTypeChange={setBookingType}
              />
            )}

            {wizardStep === 5 && (
              <OfferWizardStep5
                terms={terms}
                confirmed={confirmed}
                restaurantName={getRestaurantName()}
                offerType={offerType}
                discountPercentage={discountPercentage}
                freeItemName={offerTitle}                         // ← ADD
                otherOfferDescription={otherOfferDescription}
                title={offerTitle}
                onTermsChange={setTerms}
                onConfirmedChange={setConfirmed}
                mode={wizardMode}
              />
            )}
          </div>

          <DialogFooter className="flex gap-2">
            {wizardStep > 1 && (
              <Button variant="outline" onClick={handleWizardBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              onClick={handleWizardNext}
              disabled={!canProceed || isSubmitting}
              className="bg-[#E31E24] hover:bg-[#C01A1F]"
            >
              {isSubmitting ? "Saving..." : wizardStep === totalSteps ? (wizardMode === "edit" ? "Update Offer" : "Complete Setup") : "Next Step"}
              {wizardStep < totalSteps && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}