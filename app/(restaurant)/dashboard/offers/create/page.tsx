// "use client"

// import { useEffect, useState, useCallback } from "react"
// import { useRouter } from "next/navigation"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { Progress } from "@/components/ui/progress"
// import { Sparkles, Gift, ArrowLeft, ArrowRight } from "lucide-react"
// import { toast } from "react-toastify"
// import {
//   OfferWizardStep1,
//   OfferWizardStep2,
//   OfferWizardStep3,
//   OfferWizardStep4,
//   OfferWizardStep5,
// } from "@/components/offers"

// interface Category {
//   _id: string
//   name: string
// }

// interface ValidDays {
//   monday: boolean
//   tuesday: boolean
//   wednesday: boolean
//   thursday: boolean
//   friday: boolean
//   saturday: boolean
//   sunday: boolean
// }

// export default function CreateOfferPage() {
//   const router = useRouter()
//   const [restaurants, setRestaurants] = useState<any[]>([])
//   const [categories, setCategories] = useState<Category[]>([])
//   const [isSubmitting, setIsSubmitting] = useState(false)
//   const [checkingSubscription, setCheckingSubscription] = useState(true)
//   const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
//   const [isSubscribing, setIsSubscribing] = useState(false)

//   // Wizard state
//   const [wizardStep, setWizardStep] = useState(1)

//   // Form state - matching reference design exactly
//   const [restaurantId, setRestaurantId] = useState("")
//   const [offerType, setOfferType] = useState<"" | "discount" | "bogo">("")
//   const [discountPercentage, setDiscountPercentage] = useState("")
//   const [offerTitle, setOfferTitle] = useState("")
//   const [offerDescription, setOfferDescription] = useState("")
//   const [selectedTags, setSelectedTags] = useState<string[]>([])
//   const [customTag, setCustomTag] = useState("")
//   const [isUnlimited, setIsUnlimited] = useState(true)
//   const [redemptionLimit, setRedemptionLimit] = useState("")
//   const [redemptionResetPeriod, setRedemptionResetPeriod] = useState<"none" | "weekly" | "monthly">("none")
//   const [startDate, setStartDate] = useState("")
//   const [endDate, setEndDate] = useState("")
//   const [runUntilFurtherNotice, setRunUntilFurtherNotice] = useState(false)
//   const [validAllWeek, setValidAllWeek] = useState(true)
//   const [validDays, setValidDays] = useState<ValidDays>({
//     monday: false,
//     tuesday: false,
//     wednesday: false,
//     thursday: false,
//     friday: false,
//     saturday: false,
//     sunday: false,
//   })
//   const [dineIn, setDineIn] = useState(true)
//   const [takeaway, setTakeaway] = useState(false)
//   const [startTime, setStartTime] = useState("")
//   const [endTime, setEndTime] = useState("")
//   const [bookingType, setBookingType] = useState<"mandatory" | "recommended" | "not-needed">("recommended")
//   const [terms, setTerms] = useState("")
//   const [confirmed, setConfirmed] = useState(false)

//   const totalSteps = 5
//   const progress = (wizardStep / totalSteps) * 100

//   useEffect(() => {
//     document.title = "Create Offer"
//   }, [])

//   const fetchRestaurants = useCallback(async () => {
//     try {
//       const response = await fetch("/api/restaurant/offers/restaurant")
//       const data = await response.json()
//       if (data?.restaurants) {
//         setRestaurants(data.restaurants)
//         if (data.restaurants.length === 1) {
//           setRestaurantId(data.restaurants[0]._id)
//         }
//       }
      
//       // Fetch subscription status
//       const offersResponse = await fetch("/api/restaurant/offers?page=1&limit=1")
//       if (offersResponse.ok) {
//         const offersData = await offersResponse.json()
//         if (offersData?.subscription?.hasActiveSubscription) {
//           setHasActiveSubscription(true)
//         }
//       }
      
//       setCheckingSubscription(false)
//     } catch (error) {
//       console.error("Error fetching restaurants:", error)
//       setCheckingSubscription(false)
//     }
//   }, [])

//   const fetchCategories = useCallback(async () => {
//     try {
//       const response = await fetch("/api/categories?all=true")
//       const data = await response.json()
//       if (data?.success && data?.categories) {
//         setCategories(data.categories)
//       }
//     } catch (error) {
//       console.error("Error fetching categories:", error)
//     }
//   }, [])

//   useEffect(() => {
//     fetchRestaurants()
//     fetchCategories()
//   }, [fetchRestaurants, fetchCategories])

//   // Tag handlers
//   const toggleTag = (tagId: string) => {
//     setSelectedTags(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId])
//   }

//   const addCustomTag = async (tagName: string) => {
//     const name = tagName.trim()
//     if (!name) return

//     const existing = categories.find((category) => category.name.toLowerCase() === name.toLowerCase())
//     if (existing) {
//       setSelectedTags((prev) => (prev.includes(existing._id) ? prev : [...prev, existing._id]))
//       setCustomTag("")
//       return
//     }

//     try {
//       const response = await fetch("/api/admin/categories", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ name }),
//       })

//       if (!response.ok) {
//         const errorData = await response.json()
//         throw new Error(errorData.message || "Failed to add category")
//       }

//       const data = await response.json()
//       const newCategory = {
//         _id: data.category._id,
//         name: data.category.name,
//       }

//       // Add the new category to the list immediately (optimistic update)
//       setCategories((prev) => {
//         // Check if category already exists to avoid duplicates
//         const exists = prev.some(cat => cat._id === newCategory._id || cat.name.toLowerCase() === newCategory.name.toLowerCase())
//         if (exists) return prev
//         return [...prev, newCategory]
//       })
      
//       // Add to selected tags immediately
//       setSelectedTags((prev) => {
//         if (prev.includes(newCategory._id)) return prev
//         return [...prev, newCategory._id]
//       })
      
//       setCustomTag("")
//       toast.success("Category added successfully!")
      
//       // Refresh categories list in the background to ensure we have all categories
//       try {
//         const categoriesResponse = await fetch("/api/categories?all=true")
//         if (categoriesResponse.ok) {
//           const categoriesData = await categoriesResponse.json()
//           if (categoriesData?.success && categoriesData?.categories) {
//             setCategories(categoriesData.categories)
//           }
//         }
//       } catch (error) {
//         console.error("Error refreshing categories:", error)
//         // Ignore error, we already added the category optimistically
//       }
//     } catch (error: any) {
//       console.error("Error adding category:", error)
//       toast.error(error.message || "Failed to add category")
//     }
//   }

//   const removeTag = (tagId: string) => {
//     setSelectedTags(prev => prev.filter(t => t !== tagId))
//   }

//   const handleSubscribe = async () => {
//     try {
//       setIsSubscribing(true)
//       const restaurantIdForSub = restaurants[0]?._id

//       if (!restaurantIdForSub) {
//         toast.error("No restaurant found")
//         return
//       }

//       const response = await fetch("/api/restaurant", {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           action: "create-subscription-checkout",
//           restaurantId: restaurantIdForSub,
//         }),
//       })

//       const data = await response.json()

//       if (data.url) {
//         window.location.href = data.url
//       } else {
//         throw new Error("Failed to create checkout session")
//       }
//     } catch (error) {
//       console.error("Error starting subscription:", error)
//       toast.error("Failed to start subscription. Please try again.")
//     } finally {
//       setIsSubscribing(false)
//     }
//   }

//   const checkRequiresPremium = () => {
//     if (hasActiveSubscription) return false
//     if (offerType === "bogo") return true
//     if (offerType === "discount") {
//       const discount = Number(discountPercentage)
//       if (!discountPercentage || isNaN(discount)) return false
//       if (discount < 25) return true
//     }
//     return false
//   }

//   const requiresPremium = checkRequiresPremium()

//   const canProceedStep1 = restaurantId && offerType && (offerType === "bogo" || (offerType === "discount" && discountPercentage))
//   const canProceedStep2 = offerTitle.trim() && offerDescription.trim()
//   const canProceedStep3 =
//     (isUnlimited || redemptionLimit) &&
//     startDate &&
//     (runUntilFurtherNotice || endDate)
//   const canProceedStep4 = (() => {
//     const hasValidDays = validAllWeek || Object.values(validDays).some(day => day)
//     const hasValidTimes = startTime && endTime && startTime < endTime
//     const hasBooking = !!bookingType
//     return hasValidDays && (dineIn || takeaway) && hasValidTimes && hasBooking
//   })()
//   const canProceedStep5 = terms.trim() && confirmed

//   const canProceed =
//     (wizardStep === 1 && canProceedStep1) ||
//     (wizardStep === 2 && canProceedStep2) ||
//     (wizardStep === 3 && canProceedStep3) ||
//     (wizardStep === 4 && canProceedStep4) ||
//     (wizardStep === 5 && canProceedStep5)

//   const handleWizardBack = () => {
//     if (wizardStep > 1) setWizardStep(wizardStep - 1)
//   }

//   const handleWizardNext = () => {
//     if (wizardStep < totalSteps) setWizardStep(wizardStep + 1)
//     else handleSubmit()
//   }

//   const handleSubmit = async () => {
//     // if (requiresPremium) {
//     //   toast.error("Please upgrade to premium membership to create this offer. Offers less than 25% or Buy One Get One Free require a premium subscription.")
//     //   return
//     // }

//     setIsSubmitting(true)

//     try {
//       const validDaysArray = validAllWeek
//         ? ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
//         : Object.entries(validDays).filter(([_, isValid]) => isValid).map(([day]) => day)

//       const validDaysStr = validAllWeek
//           ? "All week"
//         : validDaysArray.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(", ")

//       const validHours = `${startTime} - ${endTime}`

//       // Map offerType to API format
//       const apiOfferType = offerType === "discount" ? "percentOff" : offerType === "bogo" ? "2for1" : offerType

//       const now = new Date()
//       const offerStart = startDate ? new Date(startDate) : null
//       let status = "inactive"
//       // Only set to active if start date/time has actually passed (not just the date)
//       if (offerStart && offerStart <= now) {
//         status = "active"
//       } else {
//         status = "inactive"
//       }

//       const recurringType = isUnlimited || redemptionResetPeriod === "none" ? null : redemptionResetPeriod

//       const payload: any = {
//         title: offerTitle,
//         description: offerDescription,
//         offerType: apiOfferType,
//         discountPercentage: offerType === "discount" ? parseInt(discountPercentage) : null,
//         validDays: validDaysStr,
//         validHours: validHours,
//         startDate: startDate ? new Date(startDate).toISOString() : null,
//         expiryDate: runUntilFurtherNotice ? null : (endDate ? new Date(endDate).toISOString() : null),
//         terms: terms.trim(),
//         dineIn: dineIn,
//         dineOut: takeaway,
//         restaurantId: restaurantId,
//         status: status,
//         runUntilFurther: runUntilFurtherNotice,
//         bookingRequirement: bookingType === "not-needed" ? "notNeeded" : bookingType,
//         maxRedemptionLimit: isUnlimited ? null : redemptionLimit,
//         isUnlimited: isUnlimited,
//         recurringType: recurringType,
//         recurringStartDate: recurringType ? new Date() : null,
//         tags: selectedTags,
//       }

//       const response = await fetch("/api/restaurant/offers", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       })

//       const data = await response.json()

//       if (!response.ok) {
//         throw new Error(data.message || "Failed to create offer")
//       }

//       toast.success("Offer created successfully")
//       router.push("/dashboard/offers")
//     } catch (error: any) {
//       toast.error(error.message || "Failed to create offer")
//     } finally {
//       setIsSubmitting(false)
//     }
//   }

//   const getRestaurantName = () => {
//     return restaurants.find(r => r._id === restaurantId)?.name || ""
//   }

//   if (checkingSubscription) {
//     return (
//       <div className="space-y-6">
//         <div className="flex items-center justify-between">
//           <h1 className="text-2xl lg:text-3xl font-bold">Create New Offer</h1>
//         </div>
//         <Card>
//           <CardContent className="py-10">
//             <div className="flex flex-col items-center justify-center space-y-4">
//               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E31E24]"></div>
//               <p className="text-lg text-gray-600">Loading...</p>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     )
//   }

//   return (
//     <div className="space-y-4 lg:space-y-6">
//       <div className="flex items-center justify-between">
//         <h1 className="text-2xl lg:text-3xl font-bold">Create New Offer</h1>
//         <Button variant="outline" onClick={() => router.push("/dashboard/offers")}>
//           Cancel
//         </Button>
//       </div>

//       <Card>
//         <CardHeader>
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-3">
//               <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E31E24] text-white">
//                 <Sparkles className="h-5 w-5" />
//               </div>
//               <div>
//                 <CardTitle>Create Your Exclusive Offer</CardTitle>
//                 <CardDescription>Step {wizardStep} of {totalSteps}</CardDescription>
//               </div>
//             </div>
//             <Badge variant="outline" className="border-[#E31E24] text-[#E31E24]">
//               <Gift className="mr-1 h-3 w-3" />
//               Exclusive
//             </Badge>
//           </div>
//           <Progress value={progress} className="h-2 mt-4" />
//         </CardHeader>

//         <CardContent>
//           <div className="min-h-[400px] py-6">
//             {wizardStep === 1 && (
//               <OfferWizardStep1
//                 restaurantId={restaurantId}
//                 offerType={offerType}
//                 discountPercentage={discountPercentage}
//                 restaurants={restaurants}
//                 hasActiveSubscription={hasActiveSubscription}
//                 onRestaurantChange={setRestaurantId}
//                 onOfferTypeChange={(value) => setOfferType(value as "" | "discount" | "bogo")}
//                 onDiscountChange={setDiscountPercentage}
//                 onUpgradeToPaid={handleSubscribe}
//               />
//             )}

//             {wizardStep === 2 && (
//               <OfferWizardStep2
//                 title={offerTitle}
//                 description={offerDescription}
//                 selectedTags={selectedTags}
//                 customTag={customTag}
//                 categories={categories}
//                 onTitleChange={setOfferTitle}
//                 onDescriptionChange={setOfferDescription}
//                 onToggleTag={toggleTag}
//                 onRemoveTag={removeTag}
//                 onCustomTagChange={setCustomTag}
//                 onAddCustomTag={addCustomTag}
//               />
//             )}

//             {wizardStep === 3 && (
//               <OfferWizardStep3
//                 isUnlimited={isUnlimited}
//                 redemptionLimit={redemptionLimit}
//                 redemptionResetPeriod={redemptionResetPeriod}
//                 startDate={startDate}
//                 endDate={endDate}
//                 runUntilFurtherNotice={runUntilFurtherNotice}
//                 onUnlimitedChange={(checked) => {
//                   setIsUnlimited(checked)
//                   if (checked) {
//                     setRedemptionLimit("")
//                     setRedemptionResetPeriod("none")
//                   }
//                 }}
//                 onRedemptionLimitChange={setRedemptionLimit}
//                 onResetPeriodChange={setRedemptionResetPeriod}
//                 onStartDateChange={setStartDate}
//                 onEndDateChange={setEndDate}
//                 onRunUntilFurtherNoticeChange={(checked) => {
//                   setRunUntilFurtherNotice(checked)
//                   if (checked) {
//                     setEndDate("")
//                   }
//                 }}
//               />
//             )}

//             {wizardStep === 4 && (
//               <OfferWizardStep4
//                 validAllWeek={validAllWeek}
//                 validDays={validDays}
//                 dineIn={dineIn}
//                 takeaway={takeaway}
//                 startTime={startTime}
//                 endTime={endTime}
//                 bookingType={bookingType}
//                 onValidAllWeekChange={(checked) => {
//                   setValidAllWeek(checked)
//                   if (checked) {
//                     setValidDays({
//                       monday: false, tuesday: false, wednesday: false, thursday: false,
//                       friday: false, saturday: false, sunday: false,
//                     })
//                   }
//                 }}
//                 onValidDayChange={(day, checked) => {
//                   setValidDays(prev => ({ ...prev, [day]: checked }))
//                 }}
//                 onDineInChange={setDineIn}
//                 onTakeawayChange={setTakeaway}
//                 onStartTimeChange={setStartTime}
//                 onEndTimeChange={setEndTime}
//                 onBookingTypeChange={setBookingType}
//               />
//             )}

//             {wizardStep === 5 && (
//               <OfferWizardStep5
//                 terms={terms}
//                 confirmed={confirmed}
//                 restaurantName={getRestaurantName()}
//                 offerType={offerType}
//                 discountPercentage={discountPercentage}
//                 title={offerTitle}
//                 onTermsChange={setTerms}
//                 onConfirmedChange={setConfirmed}
//                 mode="create"
//               />
//             )}
//           </div>

//           <div className="flex justify-between pt-6 border-t">
//             {wizardStep > 1 ? (
//               <Button variant="outline" onClick={handleWizardBack}>
//                 <ArrowLeft className="mr-2 h-4 w-4" />
//                 Back
//               </Button>
//             ) : (
//               <Button variant="outline" onClick={() => router.push("/dashboard/offers")}>
//                 Cancel
//               </Button>
//             )}
//             <Button
//               onClick={handleWizardNext}
//               disabled={!canProceed || isSubmitting}
//               className="bg-[#E31E24] hover:bg-[#C01A1F]"
//             >
//               {isSubmitting ? "Creating..." : wizardStep === totalSteps ? "Complete Setup" : "Next Step"}
//               {wizardStep < totalSteps && <ArrowRight className="ml-2 h-4 w-4" />}
//             </Button>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }
