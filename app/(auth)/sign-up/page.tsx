"use client"

import type React from "react"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import { Eye, EyeOff, Check } from "lucide-react"
import { toast } from "react-toastify"
import { useSession } from "next-auth/react"
import axios from "axios"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/context/auth-context"

function SignUpPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get("redirect")
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
      text: "Saved £38 on our bill. It paid for itself straight away.",
      name: "Mark L.",
      initials: "ML",
    },
    {
      text: "Really easy — picked an offer, showed the code, and saved money.",
      name: "Sarah, Preston",
      initials: "SP",
    },
    {
      text: "Great for finding local places without paying full price.",
      name: "Emma, Lytham St Annes",
      initials: "EL",
    },
  ]

  // Default the selected plan to Monthly so a real price ID is set from the start
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? null
  )

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
      const currentRedirectUrl = redirectUrl || searchParams.get("redirect");
      if (currentRedirectUrl) {
        sessionStorage.setItem('redirectUrl', currentRedirectUrl);
        console.log('✅ Stored redirectUrl before Stripe redirect:', currentRedirectUrl);
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
        const finalRedirectUrl = redirectUrl || searchParams.get("redirect");
        if (finalRedirectUrl) {
          sessionStorage.setItem('redirectUrl', finalRedirectUrl);
          console.log('✅ Final check - stored redirectUrl:', finalRedirectUrl);
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

      if (typeof window !== "undefined") {
        const dataLayer = (window as Window & { dataLayer?: Record<string, unknown>[] }).dataLayer
        dataLayer?.push({ event: "signup_complete" })
      }

      toast.success("Account created successfully! Redirecting to payment...", {
        autoClose: 2000
      });

      // Store redirect URL for use after payment success - store it multiple times to ensure it persists
      const currentRedirectUrl = redirectUrl || searchParams.get("redirect");
      if (currentRedirectUrl) {
        sessionStorage.setItem('redirectUrl', currentRedirectUrl);
        console.log('✅ Stored redirectUrl after signup:', currentRedirectUrl);
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Image Section - Hidden on mobile when showing form */}
        <div className={`relative h-[30vh] lg:h-auto lg:w-1/2 ${step !== 'main' ? 'hidden lg:block' : ''}`}>
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/22.png-FjHsCSsScJT76IHTeq7DFobAck45ur.jpeg"
            alt="Italian dinner table with pasta dishes and wine glasses"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Content Section */}
        <div className="flex-1 lg:w-1/2 flex flex-col bg-[#fdfaf5] overflow-y-auto">
          <div className="px-5 py-6 md:px-8 md:py-8 lg:px-12 lg:py-10">
            <div className="max-w-md mx-auto w-full">
              {/* Header with Logo and Back */}
              <div className="flex items-center justify-between mb-6 lg:mb-8">
                <Link href="/">
                  <Image
                    src="/eatinout-logo.webp"
                    alt="Eatinout"
                    width={120}
                    height={32}
                    className="h-7 lg:h-9 w-auto"
                  />
                </Link>
                <Link
                  href="/"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Back</span>
                </Link>
              </div>

              {step === 'main' ? (
                /* Main Section */
                <div className="space-y-6">
                  {(() => {
                    const availablePlans = PLANS.filter((plan) => Boolean(plan.priceId))
                    const selectedPlan =
                      availablePlans.find((plan) => plan.priceId === selectedPriceId) ?? availablePlans[0]

                    const planContent: Record<
                      string,
                      { pill: string; body: string; bottom: string }
                    > = {
                      monthly: {
                        pill: "Flexible",
                        body: "30 days free, then £4.99/month. Cancel anytime.",
                        bottom: "£4.99/month",
                      },
                      six: {
                        pill: "Save more",
                        body: "30 days free, then £29.94 every 6 months. Cancel anytime.",
                        bottom: "£29.94 / 6 months",
                      },
                      annual: {
                        pill: "Best value",
                        body: "30 days free, then £59.88/year. Cancel anytime.",
                        bottom: "£59.88/year",
                      },
                    }

                    const content = selectedPlan
                      ? planContent[selectedPlan.id] ?? {
                          pill: "",
                          body: `30 days free, then ${selectedPlan.price}${selectedPlan.period}. Cancel anytime.`,
                          bottom: `${selectedPlan.price}${selectedPlan.period}`,
                        }
                      : { pill: "", body: "", bottom: "" }

                    const benefits = [
                      "Save up to 50% when you eat out",
                      "500+ restaurants, cafés and bars",
                      "Show your voucher when you visit",
                      "New offers added regularly",
                      "Cancel anytime",
                    ]

                    return (
                      /* Warm membership panel */
                      <div className="bg-[#FFF3E2] rounded-3xl border border-[#F1DEC5] shadow-sm p-5 md:p-6 space-y-5">
                        {/* Heading */}
                        <div className="text-center space-y-2">
                          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground text-balance">
                            Choose your membership
                          </h1>
                          <p className="text-sm md:text-base text-muted-foreground text-pretty">
                            Save up to 50% when you eat out at 500+ restaurants, cafés and bars.
                          </p>
                        </div>

                        {/* Plan tabs / pills */}
                        <div
                          className="grid gap-2"
                          style={{ gridTemplateColumns: `repeat(${availablePlans.length}, minmax(0, 1fr))` }}
                        >
                          {availablePlans.map((plan) => {
                            const isSelected = selectedPlan?.priceId === plan.priceId
                            return (
                              <button
                                key={plan.id}
                                type="button"
                                onClick={() => setSelectedPriceId(plan.priceId ?? null)}
                                className={`rounded-xl py-2.5 px-2 text-sm font-semibold border transition-colors ${
                                  isSelected
                                    ? "bg-[#111111] text-white border-[#111111]"
                                    : "bg-transparent text-[#111111] border-[#111111]/30 hover:border-[#111111]"
                                }`}
                              >
                                {plan.name}
                              </button>
                            )
                          })}
                        </div>

                        {/* Selected plan card */}
                        <div className="rounded-2xl overflow-hidden shadow-md bg-white">
                          {/* Header bar */}
                          <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: "#C8102E" }}>
                            <span className="text-white text-lg font-bold">{selectedPlan?.name}</span>
                            {content.pill && (
                              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                                {content.pill}
                              </span>
                            )}
                          </div>

                          {/* Body */}
                          <div className="px-5 py-5 space-y-4">
                            <p className="text-[15px] font-medium text-[#111111]">{content.body}</p>
                            <div className="space-y-3">
                              {benefits.map((benefit) => (
                                <div key={benefit} className="flex items-center gap-3">
                                  <Check className="h-5 w-5 shrink-0" style={{ color: "#C8102E" }} strokeWidth={3} />
                                  <span className="text-base leading-snug text-[#111111]">{benefit}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Price bar */}
                          <div className="px-5 py-4 text-center" style={{ backgroundColor: "#C8102E" }}>
                            <span className="text-white text-xl font-bold">{content.bottom}</span>
                          </div>

                          {/* CTA */}
                          <div className="px-5 py-5">
                            <Button
                              onClick={() => setStep('register')}
                              className="w-full h-14 text-lg font-semibold rounded-xl bg-[#111111] text-white hover:bg-[#111111]/90 transition-colors"
                            >
                              Start my 30-day free trial
                            </Button>
                          </div>
                        </div>

                        {/* Login link */}
                        <div className="text-center">
                          <button
                            onClick={() => {
                              if (redirectUrl) {
                                router.push(`/sign-in?redirect=${encodeURIComponent(redirectUrl)}`);
                              } else {
                                router.push('/sign-in');
                              }
                            }}
                            className="text-sm text-muted-foreground hover:text-foreground underline font-medium transition-colors"
                          >
                            Already a member? Log in
                          </button>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Value Card */}
                  <div className="bg-white rounded-3xl p-5 border border-[#f0e6d8] shadow-sm">
                    <p className="text-foreground font-semibold text-sm mb-3">One meal can cover your membership</p>
                    <div className="space-y-2 text-muted-foreground text-sm">
                      <p>Spend £50 eating out</p>
                      <p>Save 50%</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#f0e6d8]">
                      <p className="text-foreground text-sm font-medium">
                        That&apos;s £25 saved — around 5 months of Eatinout
                      </p>
                    </div>
                  </div>

                  {/* Testimonial */}
                  <div className="space-y-3">
                    <h3 className="text-foreground text-sm font-semibold">What members say</h3>
                    <div className="bg-white rounded-3xl p-4 border border-[#f0e6d8] shadow-sm">
                      <p className="text-foreground text-sm mb-3">&quot;{testimonials[currentTestimonial].text}&quot;</p>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-semibold">
                          {testimonials[currentTestimonial].initials}
                        </div>
                        <p className="text-muted-foreground text-sm">{testimonials[currentTestimonial].name}</p>
                      </div>
                    </div>
                  </div>

                  {/* FAQ Section */}
                  <div className="space-y-3">
                    <h3 className="text-foreground text-sm font-semibold">FAQs</h3>
                    <div className="space-y-2">
                      <details className="bg-white rounded-2xl border border-[#f0e6d8] shadow-sm group">
                        <summary className="p-3 text-foreground text-sm font-medium cursor-pointer list-none flex justify-between items-center">
                          How much can I save?
                          <svg className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <p className="px-3 pb-3 text-muted-foreground text-sm">Save up to 50% when you eat out at 500+ participating restaurants, cafés and bars.</p>
                      </details>
                      <details className="bg-white rounded-2xl border border-[#f0e6d8] shadow-sm group">
                        <summary className="p-3 text-foreground text-sm font-medium cursor-pointer list-none flex justify-between items-center">
                          What happens after the free trial?
                          <svg className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <p className="px-3 pb-3 text-muted-foreground text-sm">After 30 days, membership is £4.99/month unless you cancel.</p>
                      </details>
                      <details className="bg-white rounded-2xl border border-[#f0e6d8] shadow-sm group">
                        <summary className="p-3 text-foreground text-sm font-medium cursor-pointer list-none flex justify-between items-center">
                          Can I cancel anytime?
                          <svg className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <p className="px-3 pb-3 text-muted-foreground text-sm">Yes. You can cancel your membership anytime.</p>
                      </details>
                    </div>
                  </div>

                  {/* Footer */}
                  <p className="text-center text-muted-foreground text-xs">
                    Save up to 50% when you eat out. Cancel anytime.
                  </p>
                </div>
              ) : step === 'login' ? (
                /* Login Form */
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
                    <p className="text-sm text-muted-foreground">Sign in to your account</p>
                  </div>
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full h-14 text-base rounded-xl border-border"
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
                        className="w-full h-14 text-base rounded-xl border-border"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-14 text-lg font-semibold rounded-full text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: "#eb221c" }}
                    >
                      Sign In
                    </Button>
                  </form>
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="w-full h-14 text-base font-medium rounded-full border-border hover:bg-muted transition-colors"
                  >
                    Back
                  </Button>
                </div>
              ) : (
                /* Register Form */
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
                    <p className="text-sm text-muted-foreground">30 days free, then £4.99/month. Cancel anytime.</p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="First Name"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full h-14 text-base rounded-xl border-border"
                        required
                      />
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Last Name"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full h-14 text-base rounded-xl border-border"
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
                        className="w-full h-14 text-base rounded-xl border-border"
                        required
                      />
                    </div>
                    <div>
                      <Input
                        id="zipCode"
                        type="text"
                        placeholder="Postcode"
                        value={formData.zipCode}
                        onChange={handleChange}
                        className="w-full h-14 text-base rounded-xl border-border"
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
                        className="w-full h-14 text-base rounded-xl border-border pr-12"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      >
                        {isPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className={`text-xs ${formData.password && !passwordValidation.isValid ? 'text-destructive' : 'text-muted-foreground'}`}>
                      Must be at least 8 characters with a number and special character
                    </p>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={isConfirmPasswordVisible ? "text" : "password"}
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full h-14 text-base rounded-xl border-border pr-12"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                      >
                        {isConfirmPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {showValidationErrors && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-destructive text-sm -mt-2">
                        Passwords do not match
                      </p>
                    )}


                    <div className="space-y-3">
                      <label className="text-foreground text-sm font-medium block">
                        Your plan
                      </label>

                      {/* Tab-style plan selector */}
                      {(() => {
                        const availablePlans = PLANS.filter((plan) => Boolean(plan.priceId))
                        const selectedPlan =
                          availablePlans.find((plan) => plan.priceId === selectedPriceId) ?? availablePlans[0]

                        const planLabels: Record<string, { title: string; then: string }> = {
                          monthly: { title: "Monthly membership", then: "Then £4.99/month" },
                          six: { title: "6 month membership", then: "Then £29.94 / 6 months" },
                          annual: { title: "Annual membership", then: "Then £59.88 / year" },
                        }

                        return (
                          <>
                            <div className="grid grid-cols-3 gap-2 rounded-full bg-[#f3ece1] p-1">
                              {availablePlans.map((plan) => {
                                const isSelected = selectedPlan?.priceId === plan.priceId
                                return (
                                  <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => setSelectedPriceId(plan.priceId ?? null)}
                                    className={`rounded-full py-2 text-sm font-semibold transition-colors ${
                                      isSelected
                                        ? "bg-foreground text-background shadow-sm"
                                        : "bg-transparent text-foreground/70 hover:text-foreground"
                                    }`}
                                  >
                                    {plan.name}
                                  </button>
                                )
                              })}
                            </div>

                            {/* Selected plan summary card */}
                            {selectedPlan && (
                              <div className="rounded-2xl border border-[#f0e6d8] bg-primary/[0.04] p-4">
                                <div className="flex items-start gap-3">
                                  <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary shrink-0">
                                    <Check className="h-3 w-3 text-white" />
                                  </span>
                                  <div>
                                    <p className="text-foreground font-semibold text-sm">
                                      {planLabels[selectedPlan.id]?.title ?? selectedPlan.name}
                                    </p>
                                    <p className="text-sm font-medium text-primary">30 days free</p>
                                    <p className="text-sm text-muted-foreground">
                                      {planLabels[selectedPlan.id]?.then ?? `Then ${selectedPlan.price}${selectedPlan.period}`}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Cancel anytime</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-card rounded-xl border border-border">
                      <Checkbox
                        id="terms"
                        checked={formData.agreeToTerms}
                        onCheckedChange={handleCheckboxChange}
                        required
                        className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <label htmlFor="terms" className="text-muted-foreground text-xs leading-relaxed">
                        I agree to the{" "}
                        <button
                          type="button"
                          onClick={() => handlePolicyNavigation('/terms')}
                          className="text-primary hover:text-primary/80 underline cursor-pointer"
                        >
                          Terms of Service
                        </button>{" "}
                        and{" "}
                        <button
                          type="button"
                          onClick={() => handlePolicyNavigation('/privacy')}
                          className="text-primary hover:text-primary/80 underline cursor-pointer"
                        >
                          Privacy Policy
                        </button>
                      </label>
                    </div>

                    <Button
                      type="submit"
                      disabled={!formData.agreeToTerms || isLoading}
                      className="w-full h-14 text-lg font-semibold rounded-full text-white hover:opacity-90 transition-opacity disabled:opacity-50"
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
                        "Create account"
                      )}
                    </Button>
                  </form>
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="w-full h-14 text-base font-medium rounded-full border-border hover:bg-muted transition-colors"
                  >
                    Back
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
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
