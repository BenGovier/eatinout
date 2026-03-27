"use client"

import type React from "react"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "react-toastify"
import { useSession } from "next-auth/react"
import axios from "axios"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/context/auth-context"

function SignUpPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  /** Post-auth destination: `redirect` or `returnTo` (same meaning). */
  const redirectUrl =
    searchParams.get("redirect") ?? searchParams.get("returnTo")
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'main' | 'register' | 'login'>('main')
  const { data: session, status }: any = useSession()
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState({
    isValid: false,
    hasMinLength: false,
    hasNumber: false,
    hasSpecialChar: false
  })
  const [referral, setReferral] = useState<string | null>(null)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const [selectedArea, setSelectedArea] = useState("")
  const [isLoadingDeals, setIsLoadingDeals] = useState(false)
  const [showDealsModal, setShowDealsModal] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [areas, setAreas] = useState<{ value: string; label: string }[]>([])
  const [areasLoading, setAreasLoading] = useState(true)
  const [restaurantCount, setRestaurantCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false);

  const [offerCount, setOfferCount] = useState(0)

  const { user, authLoading } = useAuth()

  const PLANS = [
    {
      id: "monthly",
      name: "Monthly",
      price: "£4.99",
      period: "/month",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
    },
    {
      id: "six",
      name: "6 Months",
      price: "£29.94",
      period: "/6 months",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_6MONTHS,
    },
    {
      id: "annual",
      name: "Annual",
      price: "£59.88",
      period: "/year",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_1YEAR,
    },
  ]

  const testimonials = [
    {
      text: "Saved £38 on our bill. It's already paid for itself for the next 7 months!",
      name: "Mark L.",
      image: "/testimonial-michael-brown.webp",
    },
    {
      text: "I was skeptical, but the app is so easy. I love finding new local restaurants that I didn't know were included.",
      name: "Sarah J.",
      image: "/testimonial-sarah-johnson.webp",
    },
    {
      text: "Best decision ever! We eat out twice a week and this has saved us hundreds already. The deals are incredible.",
      name: "David M.",
      image: "/testimonial-james-williams.webp",
    },
    {
      text: "So many great restaurants to choose from. The app makes it super simple to find deals near me. Highly recommend!",
      name: "Emma R.",
      image: "/testimonial-emma-davies.webp",
    },
    {
      text: "I've tried other discount apps but this one is by far the best. Real savings at quality restaurants, not just fast food.",
      name: "James T.",
      image: "/testimonial-james-williams.webp",
    },
  ]

  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null)

// ✅ KEEP only the useEffect, no early returns here
useEffect(() => {
  if (!authLoading && user) {
    if (user.role === "admin") {
      router.push("/admin/dashboard")
    } else if (user.role === "restaurant") {
      router.push("/dashboard")
    } else {
      if (redirectUrl) {
        router.push(decodeURIComponent(redirectUrl))
      } else {
        router.push("/restaurants")
      }
    }
  }
}, [user, authLoading, router, redirectUrl])

  useEffect(() => {
    document.title = "Sign Up"

    const searchParams = new URLSearchParams(window.location.search)
    const restaurantId = searchParams.get('restaurantId')
    const priceId = searchParams.get('priceId')
    if (priceId) {
      setSelectedPriceId(priceId)
    }
    if (restaurantId) sessionStorage.setItem('restaurantId', restaurantId)

    if (typeof window !== 'undefined' && (window as any).rewardful) {
      (window as any).rewardful('ready', function () {
        if ((window as any).Rewardful && (window as any).Rewardful.referral) {
          const referralId = (window as any).Rewardful.referral;
          console.log('✅ Rewardful referral captured:', referralId);
          setReferral(referralId);
        } else {
          console.log('ℹ️ No Rewardful referral found');
        }
      });
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => {
        if (prev < testimonials.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [testimonials.length])

  // Fetch areas from API
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setAreasLoading(true)
        const response = await fetch("/api/areas")

        if (!response.ok) {
          throw new Error("Failed to fetch areas")
        }

        const data = await response.json()

        if (data.success && data.areas) {
          const transformedAreas = data.areas
            .filter((area: any) => !area.hideRestaurant)
            .map((area: any) => ({
              value: area._id,
              label: area.name,
            }))

          setAreas(transformedAreas)
          console.log(`Fetched ${transformedAreas.length} areas successfully`)
        } else {
          throw new Error(data.message || "Unexpected response format")
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error("Error fetching areas:", errorMessage)
        setAreas([])
      } finally {
        setAreasLoading(false)
      }
    }

    fetchAreas()
  }, [])

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    mobile: "",
    zipCode: "",
    agreeToTerms: false,
  })

  useEffect(() => {
    const hasMinLength = formData.password.length >= 8
    const hasNumber = /\d/.test(formData.password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)
    const isValid = hasMinLength && hasNumber && hasSpecialChar

    setPasswordValidation({
      isValid,
      hasMinLength,
      hasNumber,
      hasSpecialChar
    })
  }, [formData.password])

  const sessionCheck = async () => {
    // Store redirect URL in sessionStorage for use after payment
    if (redirectUrl) {
      sessionStorage.setItem('redirectUrl', redirectUrl);
    }

    if (session?.user?.role === "admin") {
      // router.push("/admin/dashboard");
    } else if (session?.user?.role === "restaurant") {
      const res = await axios.get("/api/auth/check-session")
      router.push("/dashboard");
    } else {
      if (session?.user?.subscriptionStatus === "inactive") {
        redirectToStripeCheckout(session?.user?.email);
        sessionStorage.removeItem('triggeredLogin');
      } else {
        const res = await axios.get("/api/auth/check-session")
        // Use redirect URL if available, otherwise default to restaurants
        if (redirectUrl) {
          router.push(decodeURIComponent(redirectUrl));
        } else {
          router.push("/restaurants");
        }
      }
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      const triggeredLogin = sessionStorage.getItem('triggeredLogin');
      if (triggeredLogin) {
        sessionStorage.removeItem('triggeredLogin');
        sessionCheck();
      }
    }
  }, [status, session, router]);

  const redirectToStripeCheckout = async (email: string) => {
    try {
      setIsLoading(true);
      console.log('💳 Creating Stripe checkout with referral:', referral);
      
      // Ensure redirectUrl is stored before redirecting - get it fresh from searchParams
      if (redirectUrl) {
        sessionStorage.setItem('redirectUrl', redirectUrl);
        console.log('✅ Stored redirectUrl before Stripe redirect:', redirectUrl);
      } else {
        console.log('⚠️ No redirectUrl available before Stripe redirect');
      }

      const response = await fetch("/api/payment/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          referral,
        }),
      });

      const { url } = await response.json();

      if (response.ok && url) {
        // Final check - ensure redirectUrl is stored before navigation
        if (redirectUrl) {
          sessionStorage.setItem('redirectUrl', redirectUrl);
          console.log('✅ Final check - stored redirectUrl:', redirectUrl);
        }
        console.log('🚀 Redirecting to Stripe checkout...');
        window.location.replace(url);
      } else {
        throw new Error("Failed to create Stripe Checkout session");
      }
    } catch (error) {
      console.error("Stripe Checkout error:", error);
      toast.error("Failed to redirect to Stripe Checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    if (id === "zipCode") {
      setFormData((prev) => ({ ...prev, [id]: value.toUpperCase() }));
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, agreeToTerms: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidationErrors(true);
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      // toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (!passwordValidation.isValid) {
      // toast.error("Password must be at least 8 characters with a number and special character");
      setIsLoading(false);
      return;
    }

    try {
      console.log('📤 Submitting registration with referral:', referral);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          mobile: formData.mobile,
          zipCode: formData.zipCode,
          selectedPriceId,
          referral,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      toast.success("Account created successfully! Redirecting to payment...", {
        autoClose: 2000
      });

      // Store redirect URL for use after payment success - store it multiple times to ensure it persists
      if (redirectUrl) {
        sessionStorage.setItem('redirectUrl', redirectUrl);
        console.log('✅ Stored redirectUrl after signup:', redirectUrl);
      } else {
        console.log('⚠️ No redirectUrl found in searchParams');
      }

      if (data?.user?.email) {
        sessionStorage.setItem('checkoutEmail', data.user.email);
      } else if (formData.email) {
        sessionStorage.setItem('checkoutEmail', formData.email);
      }

      if (selectedPriceId) {
        sessionStorage.setItem('selectedPriceId', selectedPriceId);
      }

      sessionStorage.setItem('triggeredLogin', 'true');
      
      // Redirect to Stripe checkout immediately (no delay)
      await redirectToStripeCheckout(data.user.email || formData.email);
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Preserve redirect parameter when navigating to sign-in
    if (redirectUrl) {
      router.push(`/sign-in?redirect=${encodeURIComponent(redirectUrl)}`)
    } else {
      router.push('/sign-in')
    }
  }

  const handleAreaSelect = async (areaId: string, areaLabel: string) => {
    setSelectedArea(areaLabel)
    setIsDropdownOpen(false)
    setIsLoadingDeals(true)

    try {
      // Fetch restaurant count for selected area
      const response = await fetch(`/api/restaurants/all?area=${areaId}&limit=1`)
      const data = await response.json()

      if (data.success && data.pagination) {
        setRestaurantCount(data.pagination.totalRestaurants || 0)
        setOfferCount(data.selectedAreaOfferCount || 0)
      } else {
        setRestaurantCount(0)
        setOfferCount(0)
      }

      setTimeout(() => {
        setIsLoadingDeals(false)
        setShowDealsModal(true)
      }, 1000)
    } catch (error) {
      console.error("Error fetching restaurant count:", error)
      setRestaurantCount(0)
      setTimeout(() => {
        setIsLoadingDeals(false)
        setShowDealsModal(true)
      }, 1000)
    }
  }

  const handleBack = () => {
    setStep('main')
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      mobile: "",
      zipCode: "",
      agreeToTerms: false,
    })
  }

  // Save form data to sessionStorage before navigating
  const handlePolicyNavigation = (url: string) => {
    sessionStorage.setItem('signupFormData', JSON.stringify(formData))
    sessionStorage.setItem('signupStep', step)
    window.location.href = url
  }

  // Restore form data from sessionStorage on mount
  useEffect(() => {
    const savedFormData = sessionStorage.getItem('signupFormData')
    const savedStep = sessionStorage.getItem('signupStep')

    if (savedFormData) {
      try {
        const parsed = JSON.parse(savedFormData)
        setFormData(parsed)
        sessionStorage.removeItem('signupFormData')
      } catch (e) {
        console.error('Failed to restore form data:', e)
      }
    }

    if (savedStep && (savedStep === 'register' || savedStep === 'login' || savedStep === 'main')) {
      setStep(savedStep as 'main' | 'register' | 'login')
      sessionStorage.removeItem('signupStep')
    }
  }, [])

  return (
    <div className="min-h-screen relative flex flex-col">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/delicious-gourmet-restaurant-food-spread.webp")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col px-6 py-6 pb-8">
        {/* Back Button */}
        <Link href="/" className="absolute top-6 left-6 z-20 text-white/90 hover:text-white transition-colors flex items-center gap-2">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-base font-medium">Back</span>
        </Link>
        
        {/* Logo Section */}
        <Link href="/" className="flex-shrink-0 mb-6">
          <div className="text-center">
            <Image src="/eatinout-logo.webp" alt="Eatinout" width={180} height={72} className="mx-auto" priority />
          </div>
        </Link>

        {step === 'main' ? (
          /* Main Buttons Section */
          <div className="space-y-4 max-w-sm mx-auto w-full">
            <div className="text-center px-3 py-4 bg-black/30 rounded-xl backdrop-blur-sm border border-white/20">
              <p className="text-2xl font-black text-white mb-1.5 text-balance leading-tight tracking-tight font-sans">
                Save £100s Every Month
              </p>
              <p className="text-sm text-white/90 font-medium">
                Get a 7-day free trial & access up to 50% off at 400+ restaurants
              </p>
            </div>

            {/* Benefits List */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-white/20 space-y-2">
              <div className="flex items-start gap-2">
                <div className="text-green-400 text-base mt-0.5">✔</div>
                <div className="text-white text-xs">Unlimited access to 1,000s of offers</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-green-400 text-base mt-0.5">✔</div>
                <div className="text-white text-xs">Valid at 400+ restaurants</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-green-400 text-base mt-0.5">✔</div>
                <div className="text-white text-xs">No complex booking—just get your code & go</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-green-400 text-base mt-0.5">✔</div>
                <div className="text-white text-xs">Exclusive new deals added daily</div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => setStep('register')}
                className="w-full h-14 text-lg font-bold rounded-xl text-white border-0 hover:opacity-90 transition-opacity shadow-lg shadow-red-500/30"
                style={{ backgroundColor: "#eb221c" }}
              >
                Start My Free Trial
              </Button>

              <div className="text-center">
                <button
                  onClick={() => {
                    if (redirectUrl) {
                      router.push(`/sign-in?redirect=${encodeURIComponent(redirectUrl)}`);
                    } else {
                      router.push('/sign-in');
                    }
                  }}
                  className="text-sm text-white/90 hover:text-white underline font-medium transition-colors"
                >
                  Already a member? Log in
                </button>
              </div>
            </div>

            <div className="text-center space-y-1 pt-1">
              <p className="text-xs text-white font-semibold">
                Then only £4.99/month. <span className="line-through opacity-70">£8.99/month.</span>
              </p>
              <p className="text-[10px] text-white/70">Cancel anytime • No commitment • Secure payment</p>
            </div>

            {/* Social Proof Section */}
            <div className="mt-6 space-y-4">
              {/* Testimonials Section */}
              <div className="space-y-3">
                <h3 className="text-center text-white text-lg font-bold">What Our Members Say</h3>
                <div className="relative overflow-hidden">
                  <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
                  >
                    {testimonials.map((testimonial, index) => (
                      <div key={index} className="w-full flex-shrink-0 px-1">
                        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                          {/* 5 Star Rating */}
                          <div className="flex gap-1 mb-3">
                            {[...Array(5)].map((_, i) => (
                              <svg key={i} className="w-5 h-5 fill-yellow-400" viewBox="0 0 20 20">
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                              </svg>
                            ))}
                          </div>
                          <p className="text-white text-sm mb-3">"{testimonial.text}"</p>
                          <div className="flex items-center gap-3">
                            <Image
                              src={testimonial.image || "/placeholder.svg"}
                              alt={testimonial.name}
                              width={48}
                              height={48}
                              className="rounded-full"
                            />
                            <p className="text-white/90 text-sm font-semibold">{testimonial.name}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Pagination Dots */}
                  <div className="flex justify-center gap-2 mt-3">
                    {testimonials.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentTestimonial(index)}
                        className={`w-2 h-2 rounded-full transition-all ${index === currentTestimonial ? "bg-white w-6" : "bg-white/40"
                          }`}
                        aria-label={`Go to testimonial ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* <div className="space-y-3">
                <h3 className="text-center text-white text-lg font-bold">Find Deals Near You</h3>
                <p className="text-center text-white/90 text-sm">See what's on offer in your local area</p>

                {!isLoadingDeals ? (
                  <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="relative">
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        disabled={areasLoading}
                        className="w-full h-14 px-4 rounded-xl bg-white text-gray-900 text-base font-semibold hover:bg-gray-50 transition-colors shadow-md flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>{areasLoading ? "Loading areas..." : (selectedArea || "Select your area")}</span>
                        <svg
                          className={`w-5 h-5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isDropdownOpen && !areasLoading && areas.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl overflow-hidden z-50 border border-gray-200 max-h-60 overflow-y-auto">
                          {areas.map((area) => (
                            <button
                              key={area.value}
                              onClick={() => handleAreaSelect(area.value, area.label)}
                              className="w-full px-4 py-3 text-left text-gray-900 hover:bg-red-50 transition-colors text-base font-medium border-b border-gray-100 last:border-b-0"
                            >
                              {area.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {isDropdownOpen && !areasLoading && areas.length === 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl overflow-hidden z-50 border border-gray-200 p-4">
                          <p className="text-gray-500 text-sm text-center">No areas available</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-black/40 backdrop-blur-sm rounded-xl p-8 border border-white/20 flex flex-col items-center justify-center space-y-4">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div
                        className="w-3 h-3 bg-white rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-3 h-3 bg-white rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                    <p className="text-white text-base font-medium text-center">
                      Scanning for the best deals in {selectedArea}...
                    </p>
                  </div>
                )}
              </div> */}

              {/* Final CTA Section */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={() => setStep('register')}
                  className="w-full h-14 text-lg font-semibold rounded-xl text-white border-0 hover:opacity-90 transition-opacity shadow-lg shadow-red-500/30"
                  style={{ backgroundColor: "#eb221c" }}
                >
                  Start My Free Trial
                </Button>

                <div className="text-center">
                  <button
                    onClick={() => router.push('/sign-in')}
                    className="text-sm text-white/90 hover:text-white underline font-medium transition-colors"
                  >
                    Already a member? Log in
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : step === 'login' ? (
          /* Login Form */
          <div className="space-y-6 max-w-sm mx-auto w-full">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full h-14 text-lg rounded-xl bg-white/90 border-0 placeholder:text-gray-500"
                  required
                />
              </div>
              <div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full h-14 text-lg rounded-xl bg-white/90 border-0 placeholder:text-gray-500"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-14 text-lg font-semibold rounded-xl text-white border-0 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#eb221c" }}
              >
                Sign In
              </Button>
            </form>
            <Button
              onClick={handleBack}
              variant="outline"
              className="w-full h-14 text-lg font-semibold rounded-xl bg-white/90 text-gray-900 border-0 hover:bg-white transition-colors"
            >
              Back
            </Button>
          </div>
        ) : (
          /* Register Form */
          <div className="space-y-6 max-w-sm mx-auto w-full">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="firstName"
                  type="text"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full h-14 text-base rounded-xl bg-white/90 border-0 placeholder:text-gray-500"
                  required
                />
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full h-14 text-base rounded-xl bg-white/90 border-0 placeholder:text-gray-500"
                  required
                />
              </div>
              <div>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full h-14 text-lg rounded-xl bg-white/90 border-0 placeholder:text-gray-500"
                  required
                />
              </div>
              <div>
                <Input
                  id="zipCode"
                  type="text"
                  placeholder="Zip Code"
                  value={formData.zipCode}
                  onChange={handleChange}
                  className="w-full h-14 text-lg rounded-xl bg-white/90 border-0 placeholder:text-gray-500"
                  required
                />
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={isPasswordVisible ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full h-14 text-lg rounded-xl bg-white/90 border-0 placeholder:text-gray-500 pr-12"
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                >
                  {isPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className={`text-xs ${formData.password && !passwordValidation.isValid ? 'text-red-300' : 'text-white/70'}`}>
                Must be at least 8 characters with a number and special character
              </p>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={isConfirmPasswordVisible ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full h-14 text-lg rounded-xl bg-white/90 border-0 placeholder:text-gray-500 pr-12"
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                >
                  {isConfirmPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {showValidationErrors && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-red-300 text-sm -mt-2">
                  Passwords do not match
                </p>
              )}


              <div className="p-4 mb-4 bg-white/10 border border-white/20 rounded-2xl text-white">
                <label className="text-white/80 text-sm font-medium mb-2 block">
                  Choose Your Plan
                </label>

                <div className="relative">
                  {/* Dropdown button */}
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full h-14 bg-white/10 text-white/70 text-lg rounded-2xl pl-4 pr-10 text-left flex items-center justify-between"
                  >
                    {PLANS.find(plan => plan.priceId === selectedPriceId)?.name || PLANS[0].name}
                    <span className="ml-2">&#9662;</span> {/* Down arrow */}
                  </button>

                  {/* Dropdown list */}
                  {isOpen && (
                    <ul className="absolute top-0 w-full mt-1 bg-black rounded-2xl max-h-60 overflow-y-auto z-10 shadow-lg">
                      {PLANS.map(plan => (
                        <li
                          key={plan.id}
                          onClick={() => {
                            setSelectedPriceId(plan.priceId ?? PLANS[0]?.priceId ?? null);
                            setIsOpen(false);
                          }}
                          className="px-4 py-3 text-white hover:bg-gray-700 cursor-pointer"
                        >
                          {plan.name} - {plan.price}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Selected plan details */}
                {selectedPriceId && (
                  PLANS.filter(plan => plan.priceId === selectedPriceId).map(plan => (
                    <div key={plan.id} className="flex items-center justify-between mt-4 text-white/70">
                      {/* You can add any additional info here */}
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-start space-x-3 p-3 bg-black/30 rounded-xl border border-white/20">
                <Checkbox
                  id="terms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={handleCheckboxChange}
                  required
                  className="mt-0.5 border-white/50 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                />
                <label htmlFor="terms" className="text-white/90 text-xs leading-relaxed">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => handlePolicyNavigation('/terms')}
                    className="text-red-300 hover:text-red-200 underline cursor-pointer"
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => handlePolicyNavigation('/privacy')}
                    className="text-red-300 hover:text-red-200 underline cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>

              <Button
                type="submit"
                disabled={!formData.agreeToTerms || isLoading}
                className="w-full h-14 text-lg font-semibold rounded-xl text-white border-0 hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#eb221c" }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating Account...
                  </div>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
            <Button
              onClick={handleBack}
              variant="outline"
              className="w-full h-14 text-lg font-semibold rounded-xl bg-white/90 text-gray-900 border-0 hover:bg-white transition-colors"
            >
              Back
            </Button>
          </div>
        )}
      </div>

      {showDealsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="p-8">
              <div className="text-center space-y-3">
                {offerCount > 0 ? (
                  <>
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">
                      🎉 Your <span className="text-red-600">{offerCount} Deal{offerCount !== 1 ? 's' : ''}</span> {offerCount !== 1 ? 'Are' : 'Is'} Ready in {selectedArea}! 🎉
                    </h2>
                    <p className="text-base text-gray-600">Dive into delicious savings at local favorites.</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">
                      📍 Coming Soon to {selectedArea}!
                    </h2>
                    <p className="text-base text-gray-600">Dive into delicious savings at local favorites.</p>
                  </>
                )}
              </div>

              <div className="space-y-3 mt-6">
                <Button
                  onClick={() => {
                    setShowDealsModal(false)
                    setStep('register')
                  }}
                  className="w-full h-14 text-base font-bold rounded-xl text-white border-0 hover:opacity-90 transition-opacity shadow-lg"
                  style={{ backgroundColor: "#eb221c" }}
                >
                  Start Free Trial
                </Button>
                <button
                  onClick={() => setShowDealsModal(false)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 font-normal transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    }>
      <SignUpPageContent />
    </Suspense>
  )
}
