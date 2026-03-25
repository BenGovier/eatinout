"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Slider } from "@/components/ui/slider"
import { CheckCircle, Shield, Sparkles, Zap, TrendingDown, Clock } from "lucide-react"
import Image from "next/image"
import { OfferCodeModal } from "@/components/OfferCodeModal"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation" // Add router

type DishPreview = {
  id: string
  img: string
  caption: string
  pill?: string
  expiresAt?: string
}

// type PricingConfig = {
//   monthlyPrice: number
//   sixMonthPrice: number
//   annualPrice: number
//   trialDays: number
//   venuesCount: number
//   avgSavePerVisit: number
//   showTrialChip: boolean
//   secureLogos?: string[]
// }

// const config: PricingConfig = {
//   monthlyPrice: 4.99,
//   sixMonthPrice: 29.99,
//   annualPrice: 49.99,
//   trialDays: 30,
//   venuesCount: 250,
//   avgSavePerVisit: 6,
//   showTrialChip: true,
//   secureLogos: [],
// }
type PricingConfig = {
  monthlyPrice: number
  sixMonthPrice: number
  annualPrice: number
  trialDays: number
  venuesCount: number
  avgSavePerVisit: number
  showTrialChip: boolean
  secureLogos?: string[]
  priceIds: {
    monthly: string
    sixMonth: string
    annual: string
  }
}

const config: PricingConfig = {
  monthlyPrice: 4.99,
  sixMonthPrice: 29.94,
  annualPrice: 49.99,
  trialDays: 7,
  venuesCount: 250,
  avgSavePerVisit: 16.67,
  showTrialChip: true,
  secureLogos: [],
  priceIds: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "",
    sixMonth: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_6MONTHS || "",
    annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_1YEAR || "",
  },
}


const dishPreview: DishPreview[] = [
  {
    id: "1",
    img: "/gourmet-burger-fries.webp",
    caption: "2-for-1 Mains · Preston",
    pill: "Almost gone",
    expiresAt: "2025-10-08T23:59:59",
  },
  {
    id: "2",
    img: "/italian-pasta-carbonara.webp",
    caption: "20% off food · Blackpool",
    pill: "20% off",
  },
  {
    id: "3",
    img: "/sushi-platter.webp",
    caption: "Free dessert · Lancaster",
    pill: "New",
  },
  {
    id: "4",
    img: "/steak-dinner-with-wine.webp",
    caption: "2-for-1 Cocktails · Burnley",
    pill: "Popular",
  },
  {
    id: "5",
    img: "/indian-curry-thali.webp",
    caption: "30% off mains · Chorley",
    pill: "30% off",
    expiresAt: "2025-10-09T23:59:59",
  },
  {
    id: "6",
    img: "/pizza-margherita-wood-fired.webp",
    caption: "Buy 1 Get 1 · Accrington",
    pill: "Limited",
  },
]

const perDayPennies = (monthlyPrice: number) => `${Math.round((monthlyPrice / 30) * 100)}p/day`

function percentSaving(discountedPerMonth: number, monthlyPrice: number) {
  return Math.max(0, Math.round((1 - discountedPerMonth / monthlyPrice) * 100))
}

const trackEvent = (eventName: string, data?: any) => {
  console.log(` Event: ${eventName}`, data)
}

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "prepay">("monthly")
  const [prepayOption, setPrepayOption] = useState<"6months" | "annual">("annual")
  const [visits, setVisits] = useState(3)
  const [showStickyCTA, setShowStickyCTA] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<DishPreview | null>(null)
  const router = useRouter()

  const sixMonthPerMonth = config.sixMonthPrice / 6
  const annualPerMonth = config.annualPrice / 12
  const sixMonthSavings = percentSaving(sixMonthPerMonth, config.monthlyPrice)
  const annualSavings = percentSaving(annualPerMonth, config.monthlyPrice)

  const estimatedSavings = visits * config.avgSavePerVisit
  const breakEven = Math.max(1, Math.ceil(config.monthlyPrice / config.avgSavePerVisit))

  // Constants for calculator as per spec
  const MONTHLY = config.monthlyPrice
  const AVG_SAVE = config.avgSavePerVisit
  

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      setShowStickyCTA(scrollPercent > 30)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleBillingToggle = (period: "monthly" | "prepay") => {
    setBillingPeriod(period)
    trackEvent("pricing_toggle_change", { value: period })
  }

 const handlePlanSelect = (planId: string, priceId?: string) => {
    // Redirect to signup with selected price ID
    router.push(`/sign-up?plan=${planId}&priceId=${priceId}`)
  }

  const handleCalculatorChange = (value: number[]) => {
    setVisits(value[0])
    const est = value[0] * config.avgSavePerVisit
    trackEvent("pricing_calculator_change", { visits: value[0], est })
  }

  const handleDishClick = (dish: DishPreview) => {
    trackEvent("pricing_dish_preview_click", { dishId: dish.id, caption: dish.caption })
    setSelectedOffer(dish)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center">
            <img src="/eatinout-logo.webp" alt="EATINOUT" className="h-10" />
          </Link>
          <AnimatedBurgerMenu />
        </div>
      </header> */}

      <section className="relative py-16 lg:py-32 px-4 text-center overflow-hidden">
        <Image
          src="/restaurant-table-with-delicious-food-spread.webp"
          alt="Delicious restaurant food"
          fill
          priority
          sizes="100vw"
          className="object-cover"
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwMCIgaGVpZ2h0PSI4MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2VlZSIvPjwvc3ZnPg=="
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto relative z-10"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 lg:mb-6 text-balance">
            Save ££ every month when you eat out
          </h1>
          <p className="text-lg lg:text-xl text-white/90 mb-8">
            {config.trialDays} days free • Cancel anytime • Secure payments
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <Button
              size="lg"
              className="h-11 px-8 rounded-xl font-semibold"
              onClick={() => {
                trackEvent("pricing_hero_cta_click", { cta: "start_free_month" })
                handlePlanSelect("monthly",config.priceIds.monthly)
              }}
            >
              Start free trial → £4.99/month
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 px-8 rounded-xl font-semibold bg-white/10 text-white border-white/30 hover:bg-white/20"
              onClick={() => {
                trackEvent("pricing_hero_cta_click", { cta: "browse_deals" })
                window.location.href = "/"
              }}
            >
              Browse deals first
            </Button>
          </div>
          <p className="text-sm text-white/80"> Was £8.99, now £4.99/month<br/> Auto-renews. Cancel anytime.</p>
        </motion.div>
      </section>

      <section className="py-8 lg:py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center mb-8">  
            <div className="inline-flex rounded-full bg-muted p-1">
              <button
                onClick={() => handleBillingToggle("monthly")}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  billingPeriod === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => handleBillingToggle("prepay")}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  billingPeriod === "prepay" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                Prepay
              </button>
            </div>
          </div>

          {billingPeriod === "prepay" && (
            <div className="flex justify-center gap-3 mb-8">
              <Badge
                variant={prepayOption === "6months" ? "default" : "outline"}
                className="cursor-pointer px-4 py-2"
                onClick={() => setPrepayOption("6months")}
              >
                6 months
              </Badge>
              <Badge
                variant={prepayOption === "annual" ? "default" : "outline"}
                className="cursor-pointer px-4 py-2"
                onClick={() => setPrepayOption("annual")}
              >
                Annual
              </Badge>
            </div>
          )}

          <div className="mb-12">
            <h3 className="text-sm font-bold text-muted-foreground text-center mb-6">See what's inside</h3>
            <div className="relative max-w-5xl mx-auto">
              <div
                className="flex gap-3 overflow-x-auto px-4 lg:px-0 snap-x snap-mandatory scrollbar-hide"
                style={{
                  maskImage: "linear-gradient(90deg, transparent, black 16px, black calc(100% - 16px), transparent)",
                  WebkitMaskImage:
                    "linear-gradient(90deg, transparent, black 16px, black calc(100% - 16px), transparent)",
                }}
              >
                {dishPreview.map((dish) => (
                  <button
                    key={dish.id}
                    onClick={() => handleDishClick(dish)}
                    className="snap-start flex-shrink-0 w-64 rounded-xl shadow-sm overflow-hidden bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-video">
                      <Image
                        src={dish.img || "/placeholder.svg"}
                        alt={dish.caption}
                        fill
                        sizes="256px"
                        className="object-cover"
                        loading="lazy"
                      />
                      {dish.pill && (
                        <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">{dish.pill}</Badge>
                      )}
                    </div>
                    <div className="p-3 text-left">
                      <p className="text-sm font-medium line-clamp-1">{dish.caption}</p>
                      {dish.expiresAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          Ends in {Math.ceil((new Date(dish.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60))}h
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`grid gap-6 lg:gap-8 mb-12 ${billingPeriod === "monthly" || (billingPeriod === "prepay" && prepayOption) ? "grid-cols-1 max-w-md mx-auto" : "grid-cols-1 md:grid-cols-3"}`}>
            {/* Monthly Plan */}
            {billingPeriod === "monthly" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Card className="rounded-2xl shadow-lg border-2 border-primary h-full">
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xl font-bold">Monthly</h3>
                        <Badge className="bg-primary text-primary-foreground">Most popular</Badge>
                      </div>
                      {config.showTrialChip && (
                        <Badge className="bg-green-500 text-white mb-2">{config.trialDays} days free</Badge>
                      )}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">£{config.monthlyPrice}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        ≈ {perDayPennies(config.monthlyPrice)} • Cancel anytime
                      </p>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Unlock all deals</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Instant app access</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Member-only specials</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full h-12 rounded-xl font-semibold"
                      onClick={() => handlePlanSelect("monthly", config.priceIds.monthly)}
                      aria-label="Choose monthly plan"
                    >
                      Choose monthly
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* 6 Months Plan */}
            {billingPeriod === "prepay" && prepayOption === "6months" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="rounded-2xl shadow-lg border-2 border-primary h-full">
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xl font-bold">6 months</h3>
                        {sixMonthSavings > 0 ? (
                          <Badge className="bg-green-500 text-white">Save {sixMonthSavings}%</Badge>
                        ) : (
                          <Badge variant="secondary">Lock in price</Badge>
                        )}
                      </div>
                      {config.showTrialChip && (
                        <Badge className="bg-green-500 text-white mb-2">{config.trialDays} days free</Badge>
                      )}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">£{config.sixMonthPrice}</span>
                        <span className="text-muted-foreground">/6 months</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        ≈ {perDayPennies(config.sixMonthPrice / 6)} • Prepay to keep this rate
                      </p>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Unlock all deals</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Instant app access</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Member-only specials</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full h-12 rounded-xl font-semibold"
                      onClick={() => handlePlanSelect("6months",config.priceIds.sixMonth)}
                      aria-label="Choose 6 months plan"
                    >
                      Choose 6 months
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Annual Plan */}
            {billingPeriod === "prepay" && prepayOption === "annual" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="rounded-2xl shadow-lg border-2 border-primary h-full">
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xl font-bold">Annual</h3>
                        {annualSavings > 0 ? (
                          <Badge className="bg-green-500 text-white ring-1 ring-emerald-300/40">
                            Best value • Save {annualSavings}%
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Lock in price</Badge>
                        )}
                      </div>
                      {config.showTrialChip && (
                        <Badge className="bg-green-500 text-white mb-2">{config.trialDays} days free</Badge>
                      )}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">£{config.annualPrice}</span>
                        <span className="text-muted-foreground">/year</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">≈ 14p/day • Best value</p>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Unlock all deals</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Instant app access</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Member-only specials</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full h-12 rounded-xl font-semibold"
                      onClick={() => handlePlanSelect("annual",config.priceIds.annual)}
                      aria-label="Choose annual plan"
                    >
                      Choose annual
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* <section className="py-12 lg:py-16 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Will this pay for itself?</h2>
          <Card className="rounded-2xl shadow-md">
            <CardContent className="p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium">Visits per month</span>
                  <span className="text-2xl font-bold">{visits}</span>
                </div>
                <Slider
                  value={[visits]}
                  onValueChange={handleCalculatorChange}
                  max={8}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-4">
                <p className="text-sm text-center">
                  At <span className="font-semibold">{visits}</span> meals/month you'd save about{" "}
                  <span className="font-semibold text-green-600">£{estimatedSavings.toFixed(0)}</span> / month
                </p>
                <p className="text-xs text-muted-foreground text-center">Break-even: {breakEven} visits/mo.</p>
                <div className="space-y-2">
                  <div
                    className="bg-primary/20 rounded flex items-center justify-center text-xs font-medium"
                    style={{ width: `${(config.monthlyPrice / (config.monthlyPrice + estimatedSavings)) * 100}%` }}
                  >
                    £ 4.99
                  </div>
                  <div
                    className={`rounded flex items-center justify-center text-xs font-medium ${
                      estimatedSavings > config.monthlyPrice ? "bg-green-500 text-white" : "bg-muted"
                    }`}
                    style={{ width: `${(estimatedSavings / (config.monthlyPrice + estimatedSavings)) * 100}%` }}
                  >
                    £{estimatedSavings.toFixed(0)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">Typical members save £6–£20 per visit</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section> */}

      <section className="py-12 lg:py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-bold text-center mb-8 lg:mb-12">What you get</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
              <Sparkles className="h-6 w-6 text-primary flex-shrink-0" />
              <span className="font-medium">Exclusive in-venue deals</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
              <Zap className="h-6 w-6 text-primary flex-shrink-0" />
              <span className="font-medium">New offers daily</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
              <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
              <span className="font-medium">Instant codes</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
              <TrendingDown className="h-6 w-6 text-primary flex-shrink-0" />
              <span className="font-medium">Save every month</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 lg:py-12 px-4 bg-primary/5">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Badge variant="secondary" className="px-4 py-2">
              {config.venuesCount}+ venues
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Verified partners
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Secure payments
            </Badge>
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 opacity-70">
            <img src="/payments/apple-pay.webp" alt="Apple Pay" className="h-5" />
            <img src="/payments/stripe.webp" alt="Stripe" className="h-5" />
            <img src="/payments/google-pay.webp" alt="Google Pay" className="h-5" />
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="col-span-1 lg:col-span-1 row-span-2 relative aspect-square rounded-2xl overflow-hidden shadow-md">
              <Image
                src="/elegant-restaurant-interior-with-food.webp"
                alt="Restaurant dining experience"
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 400px"
                className="object-cover"
                loading="lazy"
              />
            </div>
            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-md">
              <Image
                src="/chef-preparing-gourmet-dish.webp"
                alt="Chef preparing food"
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 400px"
                className="object-cover"
                loading="lazy"
              />
            </div>
            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-md">
              <Image
                src="/friends-enjoying-meal-together.webp"
                alt="Friends dining together"
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 400px"
                className="object-cover"
                loading="lazy"
              />
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {config.venuesCount}+ local venues • New dishes weekly
          </p>
        </div>
      </section>

      <section id="faq" className="py-12 lg:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-bold text-center mb-8 lg:mb-12">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="billing" className="border rounded-xl px-4">
              <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
                How billing works?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">
                You'll be charged £{config.monthlyPrice} per month after your {config.trialDays}-day free trial. Your
                subscription auto-renews monthly unless you cancel. You can cancel anytime from your account settings.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="cancel" className="border rounded-xl px-4">
              <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
                Cancel anytime?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">
                Yes! You can cancel your subscription at any time with no penalties or fees. Your access continues until
                the end of your current billing period.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="booking" className="border rounded-xl px-4">
              <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
                Do I need to book?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">
                Most offers don't require booking - just show your code when you arrive. Some venues may require advance
                booking during peak times, which will be clearly indicated on the offer.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="redeem" className="border rounded-xl px-4">
              <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
                How do I redeem?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">
                Simply browse offers, select the one you want, and get your unique code. Show the code to staff at the
                venue before ordering or paying. It's that simple!
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="family" className="border rounded-xl px-4">
              <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
                Can I share with family?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">
                Each membership is for individual use. However, you can use your offers when dining with family and
                friends - the savings apply to your entire table at most venues.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {showStickyCTA && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-center gap-4">
            {billingPeriod === "monthly" && (
              <Button
                size="lg"
                className="h-12 px-8 rounded-xl font-semibold"
                onClick={() => {
                  trackEvent("pricing_sticky_cta_click")
                  handlePlanSelect("monthly",config.priceIds.monthly)
                }}
                aria-label="Start free month"
              >
                Start free trial → £{config.monthlyPrice}/month
              </Button>
            )}
            {billingPeriod === "prepay" && prepayOption === "6months" && (
              <Button
                size="lg"
                className="h-12 px-8 rounded-xl font-semibold"
                onClick={() => {
                  trackEvent("pricing_sticky_cta_click")
                  handlePlanSelect("6months",config.priceIds.sixMonth)
                }}
                aria-label="Choose 6 months plan"
              >
                Choose 6 months → £{config.sixMonthPrice}
              </Button>
            )}
            {billingPeriod === "prepay" && prepayOption === "annual" && (
              <Button
                size="lg"
                className="h-12 px-8 rounded-xl font-semibold"
                onClick={() => {
                  trackEvent("pricing_sticky_cta_click")
                  handlePlanSelect("annual",config.priceIds.annual)
                }}
                aria-label="Choose annual plan"
              >
                Choose annual → £{config.annualPrice}/year
              </Button>
            )}
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {config.trialDays} days free • Cancel anytime
            </span>
          </div>
        </motion.div>
      )}

      {selectedOffer && (
        <OfferCodeModal
          isOpen={!!selectedOffer}
          onClose={() => setSelectedOffer(null)}
          offerTitle={selectedOffer.caption}
          isDemoMode={true}
        />
      )}
{/* 
      <footer className="py-8 mt-8 bg-foreground">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-muted">© 2025 eatinout. All rights reserved.</p>
        </div>
      </footer> */}
    </div>
  )
}
