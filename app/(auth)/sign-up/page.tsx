"use client"

// Redeploy marker: no functional change (touched 2026-06-12)

import type React from "react"

import { useEffect, useState, useRef, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import { Eye, EyeOff, Check, ChevronLeft } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
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
  // Wizard sub-step inside the existing `register` state (details -> account -> plan)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})
  // Local refs for scroll-to-top and focusing the first field of each wizard step
  const contentRef = useRef<HTMLDivElement>(null)
  const wizardScrollRef = useRef<HTMLDivElement>(null)
  const step1FirstRef = useRef<HTMLInputElement>(null)
  const step2FirstRef = useRef<HTMLInputElement>(null)
  const step3FirstRef = useRef<HTMLButtonElement>(null)
  // Directional step transition (1 = forward, -1 = back) + reduced-motion preference
  const [direction, setDirection] = useState<1 | -1>(1)
  const shouldReduceMotion = useReducedMotion()
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
      // No discount on monthly
      originalPrice: null as string | null,
      discountLabel: null as string | null,
      perMonth: null as string | null,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
    },
    {
      id: "six",
      name: "6 Months",
      price: "£25.45",
      period: "/6 months",
      originalPrice: "£29.94",
      discountLabel: "15% off",
      perMonth: "£4.24/month",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_6MONTHS_DISCOUNT,
    },
    {
      id: "annual",
      name: "Annual",
      price: "£47.90",
      period: "/year",
      originalPrice: "£59.88",
      discountLabel: "20% off",
      perMonth: "£3.99/month",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_1YEAR_DISCOUNT,
    },
  ]

  // Default the selected plan to Monthly so a real price ID is set from the start
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? null
  )

// ✅ KEEP only the useEffect, no early returns here
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
          priceId: selectedPriceId,
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
    // Clear this field's inline error as the user corrects it
    setStepErrors((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
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

  // Validate only the current wizard step, reusing the existing validation rules
  const validateStep = (s: 1 | 2 | 3): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (s === 1) {
      if (!formData.firstName.trim()) errors.firstName = "Please enter your first name"
      if (!formData.lastName.trim()) errors.lastName = "Please enter your last name"
      if (!formData.email.trim()) {
        errors.email = "Please enter your email"
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = "Please enter a valid email address"
      }
    }
    if (s === 2) {
      if (!formData.zipCode.trim()) errors.zipCode = "Please enter your postcode"
      if (!formData.password) {
        errors.password = "Please enter a password"
      } else if (!passwordValidation.isValid) {
        errors.password = "Must be at least 8 characters with a number and special character"
      }
      if (!formData.confirmPassword) {
        errors.confirmPassword = "Please confirm your password"
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match"
      }
    }
    if (s === 3) {
      if (!selectedPriceId) errors.plan = "Please select a plan"
      if (!formData.agreeToTerms) errors.terms = "Please accept the terms to continue"
    }
    return errors
  }

  // Advance from steps 1 and 2 only (never submits the registration form)
  const handleContinue = () => {
    const errors = validateStep(currentStep)
    setStepErrors(errors)
    if (currentStep === 2) setShowValidationErrors(true)
    if (Object.keys(errors).length > 0) {
      // Focus the first invalid field so the user can correct it
      if (currentStep === 1) {
        if (errors.firstName) step1FirstRef.current?.focus()
        else if (errors.email) document.getElementById("email")?.focus()
      } else if (currentStep === 2) {
        if (errors.zipCode) step2FirstRef.current?.focus()
        else if (errors.password) document.getElementById("password")?.focus()
        else if (errors.confirmPassword) document.getElementById("confirmPassword")?.focus()
      }
      return
    }
    setDirection(1)
    setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev))
  }

  // Single Back control for the wizard: step 1 -> main (without wiping the form),
  // steps 2 and 3 -> previous step (preserving entered values)
  const handleWizardBack = () => {
    setStepErrors({})
    if (currentStep === 1) {
      setStep('main')
    } else {
      setDirection(-1)
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)
    }
  }

  // Focus the first interactive element of the active step (after the transition)
  const focusCurrentStep = () => {
    if (currentStep === 1) step1FirstRef.current?.focus()
    else if (currentStep === 2) step2FirstRef.current?.focus()
    else if (currentStep === 3) step3FirstRef.current?.focus()
  }

  // Directional variants for the step transition (respect reduced motion)
  const stepVariants = {
    enter: (dir: number) => ({ opacity: 0, x: shouldReduceMotion ? 0 : dir * 24 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: shouldReduceMotion ? 0 : dir * -24 }),
  }

  // Enter runs the current step's Continue action (steps 1-2); step 3 submits normally.
  // Guarded against IME composition so Enter doesn't advance mid-composition.
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter") return
    if (e.nativeEvent.isComposing || (e as unknown as { keyCode: number }).keyCode === 229) return
    if (currentStep !== 3) {
      e.preventDefault()
      handleContinue()
    }
  }

  // Save form data to sessionStorage before navigating
  const handlePolicyNavigation = (url: string) => {
    sessionStorage.setItem('signupFormData', JSON.stringify(formData))
    sessionStorage.setItem('signupStep', step)
    // Extra wizard context (new keys; existing keys untouched)
    sessionStorage.setItem('signupCurrentStep', String(currentStep))
    if (selectedPriceId) sessionStorage.setItem('signupSelectedPriceId', selectedPriceId)
    window.location.href = url
  }

  // Restore form data from sessionStorage on mount
  useEffect(() => {
    const savedFormData = sessionStorage.getItem('signupFormData')
    const savedStep = sessionStorage.getItem('signupStep')
    const savedCurrentStep = sessionStorage.getItem('signupCurrentStep')
    const savedSelectedPriceId = sessionStorage.getItem('signupSelectedPriceId')

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

    if (savedCurrentStep) {
      const n = Number(savedCurrentStep)
      if (n === 1 || n === 2 || n === 3) {
        setCurrentStep(n as 1 | 2 | 3)
      }
      sessionStorage.removeItem('signupCurrentStep')
    }

    if (savedSelectedPriceId) {
      setSelectedPriceId(savedSelectedPriceId)
      sessionStorage.removeItem('signupSelectedPriceId')
    }
  }, [])

  // On wizard step change, scroll the wizard content back to the top.
  // Focus is moved to the first field once the step transition completes
  // (see onAnimationComplete on the animated step wrapper).
  useEffect(() => {
    if (step !== 'register') return
    wizardScrollRef.current?.scrollTo?.({ top: 0 })
  }, [currentStep, step])

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
        <div className="flex-1 lg:w-1/2 flex flex-col bg-[#fdfaf5]">
          {step === 'register' ? (() => {
            /* ---------- Mobile-first, app-style signup wizard ---------- */
            const availablePlans = PLANS.filter((plan) => Boolean(plan.priceId))
            const selectedPlan =
              availablePlans.find((plan) => plan.priceId === selectedPriceId) ?? availablePlans[0]

            const planLabels: Record<string, { title: string; then: string }> = {
              monthly: { title: "Monthly membership", then: "Then £4.99/month" },
              six: { title: "6 month membership", then: "Then £25.45 / 6 months (£4.24/month) — save 15%" },
              annual: { title: "Annual membership", then: "Then £47.90 / year (£3.99/month) — save 20%" },
            }

            const passwordRequirements = [
              { met: passwordValidation.hasMinLength, label: "8 or more characters" },
              { met: passwordValidation.hasNumber, label: "One number" },
              { met: passwordValidation.hasSpecialChar, label: "One special character" },
            ]

            const headings: Record<1 | 2 | 3, { title: string; copy: string; tag: string }> = {
              1: { title: "Create your account", copy: "It only takes a minute.", tag: "Your details" },
              2: { title: "Secure your account", copy: "Create a password to protect your membership.", tag: "Security" },
              3: { title: "Choose your plan", copy: "Start with 30 days free. Cancel anytime.", tag: "Your plan" },
            }

            return (
              <div className="flex flex-1 flex-col min-h-[100dvh] lg:min-h-full">
                {/* Compact wizard header */}
                <header className="shrink-0 flex items-center h-14 px-2 border-b border-[#F1DEC5]/70">
                  <button
                    type="button"
                    onClick={handleWizardBack}
                    aria-label={currentStep === 1 ? "Back to membership options" : "Back to the previous step"}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb221c]"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <div className="flex flex-1 justify-center">
                    <Image
                      src="/eatinout-logo.webp"
                      alt="Eatinout"
                      width={120}
                      height={32}
                      className="h-7 w-auto"
                      priority
                    />
                  </div>
                  <div className="h-10 w-10 shrink-0" aria-hidden="true" />
                </header>

                <form
                  onSubmit={handleSubmit}
                  onKeyDown={handleFormKeyDown}
                  className="flex flex-1 flex-col min-h-0"
                >
                  {/* Scrollable step area */}
                  <div ref={wizardScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                    <div className="mx-auto w-full max-w-md px-5 pt-5">
                      {/* Progress (stable position; only the fill animates) */}
                      <div className="mb-6">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Step {currentStep} of 3
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">
                            {headings[currentStep].tag}
                          </span>
                        </div>
                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full bg-[#ece3d6]"
                          role="progressbar"
                          aria-valuemin={1}
                          aria-valuemax={3}
                          aria-valuenow={currentStep}
                          aria-label={`Sign up progress: step ${currentStep} of 3`}
                        >
                          <div
                            className="h-full rounded-full bg-[#eb221c] transition-[width] duration-300 ease-out motion-reduce:transition-none"
                            style={{ width: `${(currentStep / 3) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Animated step content */}
                      <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                          key={currentStep}
                          custom={direction}
                          variants={stepVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{ duration: shouldReduceMotion ? 0.12 : 0.26, ease: "easeOut" }}
                          onAnimationComplete={(def) => {
                            if (def === "center") focusCurrentStep()
                          }}
                        >
                          {/* Heading */}
                          <div className="mb-5 space-y-1.5">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
                              {headings[currentStep].title}
                            </h1>
                            <p className="text-sm text-muted-foreground text-pretty">
                              {headings[currentStep].copy}
                            </p>
                          </div>

                          {/* STEP 1 — Your details */}
                          {currentStep === 1 && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label htmlFor="firstName" className="sr-only">First name</label>
                                  <Input
                                    ref={step1FirstRef}
                                    id="firstName"
                                    type="text"
                                    placeholder="First name"
                                    autoComplete="given-name"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    aria-invalid={!!stepErrors.firstName}
                                    aria-describedby={stepErrors.firstName ? "firstName-error" : undefined}
                                    className="w-full h-14 text-base rounded-xl border-border"
                                  />
                                  {stepErrors.firstName && (
                                    <p id="firstName-error" className="mt-1.5 text-sm text-destructive">{stepErrors.firstName}</p>
                                  )}
                                </div>
                                <div>
                                  <label htmlFor="lastName" className="sr-only">Last name</label>
                                  <Input
                                    id="lastName"
                                    type="text"
                                    placeholder="Last name"
                                    autoComplete="family-name"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    aria-invalid={!!stepErrors.lastName}
                                    aria-describedby={stepErrors.lastName ? "lastName-error" : undefined}
                                    className="w-full h-14 text-base rounded-xl border-border"
                                  />
                                  {stepErrors.lastName && (
                                    <p id="lastName-error" className="mt-1.5 text-sm text-destructive">{stepErrors.lastName}</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <label htmlFor="email" className="sr-only">Email</label>
                                <Input
                                  id="email"
                                  type="email"
                                  placeholder="Email"
                                  autoComplete="email"
                                  inputMode="email"
                                  value={formData.email}
                                  onChange={handleChange}
                                  aria-invalid={!!stepErrors.email}
                                  aria-describedby={stepErrors.email ? "email-error" : undefined}
                                  className="w-full h-14 text-base rounded-xl border-border"
                                />
                                {stepErrors.email && (
                                  <p id="email-error" className="mt-1.5 text-sm text-destructive">{stepErrors.email}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* STEP 2 — Secure your account */}
                          {currentStep === 2 && (
                            <div className="space-y-4">
                              <div>
                                <label htmlFor="zipCode" className="sr-only">Postcode</label>
                                <Input
                                  ref={step2FirstRef}
                                  id="zipCode"
                                  type="text"
                                  placeholder="Postcode"
                                  autoComplete="postal-code"
                                  autoCapitalize="characters"
                                  value={formData.zipCode}
                                  onChange={handleChange}
                                  aria-invalid={!!stepErrors.zipCode}
                                  aria-describedby={stepErrors.zipCode ? "zipCode-error" : undefined}
                                  className="w-full h-14 text-base rounded-xl border-border"
                                />
                                {stepErrors.zipCode && (
                                  <p id="zipCode-error" className="mt-1.5 text-sm text-destructive">{stepErrors.zipCode}</p>
                                )}
                              </div>
                              <div>
                                <label htmlFor="password" className="sr-only">Password</label>
                                <div className="relative">
                                  <Input
                                    id="password"
                                    type={isPasswordVisible ? "text" : "password"}
                                    placeholder="Password"
                                    autoComplete="new-password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    aria-describedby="password-requirements"
                                    className="w-full h-14 text-base rounded-xl border-border pr-12"
                                  />
                                  <button
                                    type="button"
                                    aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb221c]"
                                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                  >
                                    {isPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                  </button>
                                </div>
                                {/* Live password requirements */}
                                <ul id="password-requirements" className="mt-2.5 space-y-1.5" aria-live="polite">
                                  {passwordRequirements.map((req) => (
                                    <li key={req.label} className="flex items-center gap-2 text-xs">
                                      <span
                                        className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
                                          req.met ? "bg-emerald-500 text-white" : "bg-[#e6dccb] text-transparent"
                                        }`}
                                      >
                                        <Check className="h-3 w-3" strokeWidth={3} />
                                      </span>
                                      <span className={req.met ? "font-medium text-emerald-700" : "text-muted-foreground"}>
                                        {req.label}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                                {stepErrors.password && formData.password.length === 0 && (
                                  <p className="mt-1.5 text-sm text-destructive">{stepErrors.password}</p>
                                )}
                              </div>
                              <div>
                                <label htmlFor="confirmPassword" className="sr-only">Confirm password</label>
                                <div className="relative">
                                  <Input
                                    id="confirmPassword"
                                    type={isConfirmPasswordVisible ? "text" : "password"}
                                    placeholder="Confirm password"
                                    autoComplete="new-password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    aria-invalid={!!stepErrors.confirmPassword}
                                    aria-describedby={stepErrors.confirmPassword ? "confirmPassword-error" : undefined}
                                    className="w-full h-14 text-base rounded-xl border-border pr-12"
                                  />
                                  <button
                                    type="button"
                                    aria-label={isConfirmPasswordVisible ? "Hide password" : "Show password"}
                                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb221c]"
                                    onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                                  >
                                    {isConfirmPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                  </button>
                                </div>
                                {stepErrors.confirmPassword && (
                                  <p id="confirmPassword-error" className="mt-1.5 text-sm text-destructive">{stepErrors.confirmPassword}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* STEP 3 — Choose your plan */}
                          {currentStep === 3 && (
                            <div className="space-y-4">
                              <div
                                className="space-y-3"
                                role="radiogroup"
                                aria-label="Membership plan"
                              >
                                {availablePlans.map((plan, index) => {
                                  const isSelected = selectedPlan?.priceId === plan.priceId
                                  return (
                                    <button
                                      key={plan.id}
                                      ref={index === 0 ? step3FirstRef : undefined}
                                      type="button"
                                      role="radio"
                                      aria-checked={isSelected}
                                      onClick={() => {
                                        setSelectedPriceId(plan.priceId ?? null)
                                        setStepErrors((prev) => {
                                          if (!prev.plan) return prev
                                          const next = { ...prev }
                                          delete next.plan
                                          return next
                                        })
                                      }}
                                      className={`w-full rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eb221c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdfaf5] ${
                                        isSelected
                                          ? "border-2 border-[#eb221c] bg-[#fdecec] shadow-md"
                                          : "border border-[#e6d8c2] bg-white hover:border-[#d8c3a3]"
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-base font-bold text-foreground">{plan.name}</span>
                                            {plan.discountLabel && (
                                              <span className="rounded-full bg-[#eb221c] px-2 py-0.5 text-[11px] font-semibold text-white">
                                                {plan.discountLabel}
                                              </span>
                                            )}
                                          </div>
                                          <div className="mt-1 flex items-baseline gap-2">
                                            {plan.originalPrice && (
                                              <span className="text-sm text-muted-foreground line-through">{plan.originalPrice}</span>
                                            )}
                                            <span className="text-lg font-bold text-foreground">{plan.price}</span>
                                            <span className="text-sm text-muted-foreground">{plan.period}</span>
                                          </div>
                                          {plan.perMonth && (
                                            <p className="mt-0.5 text-sm text-muted-foreground">Just {plan.perMonth}</p>
                                          )}
                                          <p className="mt-1 text-xs font-semibold text-[#eb221c]">30 days free</p>
                                        </div>
                                        <span
                                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                            isSelected
                                              ? "border-[#eb221c] bg-[#eb221c] text-white"
                                              : "border-[#d8c7ad] text-transparent"
                                          }`}
                                        >
                                          <Check className="h-4 w-4" strokeWidth={3} />
                                        </span>
                                      </div>
                                    </button>
                                  )
                                })}
                                {stepErrors.plan && (
                                  <p className="text-sm text-destructive">{stepErrors.plan}</p>
                                )}
                              </div>

                              {/* Selected plan summary */}
                              {selectedPlan && (
                                <div className="rounded-2xl border border-[#f0e6d8] bg-[#eb221c]/[0.04] p-4">
                                  <div className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eb221c]">
                                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                    </span>
                                    <div className="text-sm">
                                      <p className="font-semibold text-foreground">
                                        {planLabels[selectedPlan.id]?.title ?? selectedPlan.name}
                                      </p>
                                      <p className="font-medium text-[#eb221c]">30 days free</p>
                                      <p className="text-muted-foreground">
                                        {planLabels[selectedPlan.id]?.then ?? `Then ${selectedPlan.price}${selectedPlan.period}`}
                                      </p>
                                      <p className="text-muted-foreground">Cancel anytime</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Terms — whole row taps toggle the checkbox; links never toggle it */}
                              <div className="rounded-xl border border-border bg-card p-3">
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    id="terms"
                                    aria-label="I agree to the Terms of Service and Privacy Policy"
                                    checked={formData.agreeToTerms}
                                    onCheckedChange={(checked) => {
                                      handleCheckboxChange(checked as boolean)
                                      if (checked) {
                                        setStepErrors((prev) => {
                                          if (!prev.terms) return prev
                                          const next = { ...prev }
                                          delete next.terms
                                          return next
                                        })
                                      }
                                    }}
                                    className="mt-0.5 shrink-0 border-border data-[state=checked]:bg-[#eb221c] data-[state=checked]:border-[#eb221c]"
                                  />
                                  <p
                                    className="cursor-pointer text-sm leading-relaxed text-muted-foreground"
                                    onClick={() => {
                                      const next = !formData.agreeToTerms
                                      handleCheckboxChange(next)
                                      if (next) {
                                        setStepErrors((prev) => {
                                          if (!prev.terms) return prev
                                          const n = { ...prev }
                                          delete n.terms
                                          return n
                                        })
                                      }
                                    }}
                                  >
                                    I agree to the{" "}
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handlePolicyNavigation('/terms') }}
                                      className="text-[#eb221c] underline underline-offset-2 hover:opacity-80"
                                    >
                                      Terms of Service
                                    </button>{" "}
                                    and{" "}
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handlePolicyNavigation('/privacy') }}
                                      className="text-[#eb221c] underline underline-offset-2 hover:opacity-80"
                                    >
                                      Privacy Policy
                                    </button>
                                  </p>
                                </div>
                              </div>
                              {stepErrors.terms && (
                                <p className="text-sm text-destructive">{stepErrors.terms}</p>
                              )}
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Sticky bottom action area */}
                  <div className="shrink-0 border-t border-[#F1DEC5]/70 bg-[#fdfaf5]/95 px-5 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
                    <div className="mx-auto w-full max-w-md">
                      {currentStep < 3 ? (
                        <Button
                          type="button"
                          onClick={handleContinue}
                          className="h-14 w-full rounded-2xl bg-[#eb221c] text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#d41f19] active:bg-[#bd1b16]"
                        >
                          Continue
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={!formData.agreeToTerms || isLoading}
                          className="h-14 w-full rounded-2xl bg-[#eb221c] text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#d41f19] active:bg-[#bd1b16] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isLoading ? (
                            <div className="flex items-center justify-center">
                              <svg className="-ml-1 mr-2 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Creating account...
                            </div>
                          ) : (
                            "Start my 30-day free trial"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            )
          })() : (
          <div ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="px-5 py-6 md:px-8 md:py-8 lg:px-12 lg:py-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Home</span>
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
                        pill: "Save 15%",
                        body: "30 days free, then £25.45 every 6 months (just £4.24/month). Cancel anytime.",
                        bottom: "£25.45 / 6 months",
                      },
                      annual: {
                        pill: "Save 20%",
                        body: "30 days free, then £47.90/year (just £3.99/month). Cancel anytime.",
                        bottom: "£47.90/year",
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

                        {/* Membership card (plan is chosen later, on wizard Step 3) */}
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
                            {selectedPlan?.originalPrice ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-baseline justify-center gap-2">
                                  <span className="text-white/70 text-base font-medium line-through">
                                    {selectedPlan.originalPrice}
                                  </span>
                                  <span className="text-white text-xl font-bold">{content.bottom}</span>
                                </div>
                                {selectedPlan?.perMonth && (
                                  <span className="text-white/90 text-sm font-medium">
                                    Just {selectedPlan.perMonth}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-white text-xl font-bold">{content.bottom}</span>
                            )}
                          </div>

                          {/* CTA */}
                          <div className="px-5 py-5">
                            <Button
                              onClick={() => { setDirection(1); setCurrentStep(1); setStep('register') }}
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
                /* Register Wizard */
                <div className="space-y-6">
                  {/* Progress indicator */}
                  <div className="space-y-2" role="group" aria-label={`Step ${currentStep} of 3`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Step {currentStep} of 3
                      </span>
                    </div>
                    <div className="flex gap-1.5" aria-hidden="true">
                      {[1, 2, 3].map((n) => (
                        <div
                          key={n}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            n <= currentStep ? "bg-primary" : "bg-[#ece3d6]"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Step heading */}
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                      {currentStep === 1
                        ? "Create your account"
                        : currentStep === 2
                          ? "Secure your account"
                          : "Choose your plan"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {currentStep === 1
                        ? "It only takes a minute."
                        : currentStep === 2
                          ? "Choose a strong password to protect your account."
                          : "Start with 30 days free. Cancel anytime."}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-4">
                    {/* STEP 1 — Your details */}
                    {currentStep === 1 && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Input
                              ref={step1FirstRef}
                              id="firstName"
                              type="text"
                              placeholder="First Name"
                              autoComplete="given-name"
                              value={formData.firstName}
                              onChange={handleChange}
                              className="w-full h-14 text-base rounded-xl border-border"
                            />
                            {stepErrors.firstName && (
                              <p className="mt-1 text-destructive text-sm">{stepErrors.firstName}</p>
                            )}
                          </div>
                          <div>
                            <Input
                              id="lastName"
                              type="text"
                              placeholder="Last Name"
                              autoComplete="family-name"
                              value={formData.lastName}
                              onChange={handleChange}
                              className="w-full h-14 text-base rounded-xl border-border"
                            />
                            {stepErrors.lastName && (
                              <p className="mt-1 text-destructive text-sm">{stepErrors.lastName}</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <Input
                            id="email"
                            type="email"
                            placeholder="Email"
                            autoComplete="email"
                            inputMode="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full h-14 text-base rounded-xl border-border"
                          />
                          {stepErrors.email && (
                            <p className="mt-1 text-destructive text-sm">{stepErrors.email}</p>
                          )}
                        </div>
                      </>
                    )}

                    {/* STEP 2 — Secure your account */}
                    {currentStep === 2 && (
                      <>
                        <div>
                          <Input
                            ref={step2FirstRef}
                            id="zipCode"
                            type="text"
                            placeholder="Postcode"
                            autoComplete="postal-code"
                            value={formData.zipCode}
                            onChange={handleChange}
                            className="w-full h-14 text-base rounded-xl border-border"
                          />
                          {stepErrors.zipCode && (
                            <p className="mt-1 text-destructive text-sm">{stepErrors.zipCode}</p>
                          )}
                        </div>
                        <div>
                          <div className="relative">
                            <Input
                              id="password"
                              type={isPasswordVisible ? "text" : "password"}
                              placeholder="Password"
                              autoComplete="new-password"
                              value={formData.password}
                              onChange={handleChange}
                              className="w-full h-14 text-base rounded-xl border-border pr-12"
                            />
                            <button
                              type="button"
                              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                            >
                              {isPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                          <p className={`mt-1 text-xs ${formData.password && !passwordValidation.isValid ? 'text-destructive' : 'text-muted-foreground'}`}>
                            Must be at least 8 characters with a number and special character
                          </p>
                          {stepErrors.password && formData.password.length === 0 && (
                            <p className="mt-1 text-destructive text-sm">{stepErrors.password}</p>
                          )}
                        </div>
                        <div>
                          <div className="relative">
                            <Input
                              id="confirmPassword"
                              type={isConfirmPasswordVisible ? "text" : "password"}
                              placeholder="Confirm Password"
                              autoComplete="new-password"
                              value={formData.confirmPassword}
                              onChange={handleChange}
                              className="w-full h-14 text-base rounded-xl border-border pr-12"
                            />
                            <button
                              type="button"
                              aria-label={isConfirmPasswordVisible ? "Hide password" : "Show password"}
                              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                            >
                              {isConfirmPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                          {stepErrors.confirmPassword && (
                            <p className="mt-1 text-destructive text-sm">{stepErrors.confirmPassword}</p>
                          )}
                        </div>
                      </>
                    )}

                    {/* STEP 3 — Choose your plan */}
                    {currentStep === 3 && (
                      <>
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
                              six: { title: "6 month membership", then: "Then £25.45 / 6 months (£4.24/month) — save 15%" },
                              annual: { title: "Annual membership", then: "Then £47.90 / year (£3.99/month) — save 20%" },
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
                          {stepErrors.plan && (
                            <p className="text-destructive text-sm">{stepErrors.plan}</p>
                          )}
                        </div>

                        <div className="flex items-start space-x-3 p-3 bg-card rounded-xl border border-border">
                          <Checkbox
                            id="terms"
                            checked={formData.agreeToTerms}
                            onCheckedChange={handleCheckboxChange}
                            className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <label htmlFor="terms" className="text-muted-foreground text-sm leading-relaxed">
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
                        {stepErrors.terms && (
                          <p className="text-destructive text-sm">{stepErrors.terms}</p>
                        )}
                      </>
                    )}

                    {/* Navigation */}
                    {currentStep < 3 ? (
                      <Button
                        type="button"
                        onClick={handleContinue}
                        className="w-full h-14 text-lg font-semibold rounded-full text-white hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: "#eb221c" }}
                      >
                        Continue
                      </Button>
                    ) : (
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
                          "Start my 30-day free trial"
                        )}
                      </Button>
                    )}

                    <Button
                      type="button"
                      onClick={handleWizardBack}
                      variant="outline"
                      className="w-full h-14 text-base font-medium rounded-full border-border hover:bg-muted transition-colors"
                    >
                      Back
                    </Button>
                  </form>
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
                    setDirection(1)
                    setCurrentStep(1)
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
