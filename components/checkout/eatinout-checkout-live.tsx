"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Lock, Check, ShieldCheck, Star, ArrowRight, Loader2, CreditCard } from "lucide-react"
import { loadStripe, type StripeCardNumberElementChangeEvent, type StripeCardExpiryElementChangeEvent, type StripeCardCvcElementChangeEvent } from "@stripe/stripe-js"
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import { LoadReveal, ViewReveal, StaggerGroup, StaggerItem } from "@/components/prototypes/eatinout-checkout/motion"
import { CheckoutExitGuard } from "./checkout-exit-guard"
import { useAuth } from "@/context/auth-context"

// ── DEBUG: confirm the publishable key actually made it into the bundle ──
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
console.log(
  "[checkout][debug] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:",
  STRIPE_PUBLISHABLE_KEY ? `present (starts with ${STRIPE_PUBLISHABLE_KEY.slice(0, 7)}...)` : "MISSING"
)

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY!).then((s) => {
  console.log("[checkout][debug] loadStripe resolved:", s ? "OK — stripe.js object created" : "NULL — check the publishable key / network tab for stripe.js")
  return s
})

const palette = {
  "--p-bg": "#F7F3EF",
  "--p-surface": "#FFFFFF",
  "--p-cream": "#FFF8F3",
  "--p-blush": "#FFF0F3",
  "--p-blush-strong": "#FADDE3",
  "--p-ink": "#191715",
  "--p-body": "#625D58",
  "--p-muted": "#817A74",
  "--p-gold": "#C28C32",
  "--p-sage": "#5F7A68",
  "--p-sage-bg": "#EEF4EF",
  "--p-red": "#D90429",
  "--p-red-hover": "#B80324",
  "--p-border": "rgba(25,23,21,0.08)",
  "--p-field": "#FCFBFA",
  "--p-arrow": "#A29A94",
  "--p-sep": "#BBB4AE",
} as React.CSSProperties

// Stripe iframe elements can't read CSS custom properties, so these are the
// same values as --p-ink / --p-muted / --p-red hardcoded for element styling.
const STRIPE_ELEMENT_STYLE = {
  base: {
    fontSize: "14px",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: "#191715",
    "::placeholder": {
      color: "rgba(129, 122, 116, 0.75)",
    },
  },
  invalid: {
    color: "#D90429",
  },
}

type Pricing = {
  baseAmount: number
  discountedAmount: number
  currency: string
  interval: string
  intervalCount: number
  discountLabel: string | null
}

// Known plan prices (same values as the sign-up page) so the price shows instantly
// while /api/payment/create-subscription is still running. The real Stripe pricing
// from the API replaces this as soon as it arrives.
const KNOWN_PLANS: Record<string, Pricing> = {}
const registerPlan = (priceId: string | undefined, pricing: Pricing) => {
  if (priceId) KNOWN_PLANS[priceId] = pricing
}
registerPlan(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID, { baseAmount: 499, discountedAmount: 499, currency: "gbp", interval: "month", intervalCount: 1, discountLabel: null })
registerPlan(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_6MONTHS, { baseAmount: 2994, discountedAmount: 2994, currency: "gbp", interval: "month", intervalCount: 6, discountLabel: null })
registerPlan(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_6MONTHS_DISCOUNT, { baseAmount: 2545, discountedAmount: 2545, currency: "gbp", interval: "month", intervalCount: 6, discountLabel: null })
registerPlan(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_1YEAR, { baseAmount: 5988, discountedAmount: 5988, currency: "gbp", interval: "year", intervalCount: 1, discountLabel: null })
registerPlan(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_1YEAR_DISCOUNT, { baseAmount: 4790, discountedAmount: 4790, currency: "gbp", interval: "year", intervalCount: 1, discountLabel: null })

function formatMoney(pence: number, currency: string): string {
  const symbol = currency.toLowerCase() === "gbp" ? "£" : `${currency.toUpperCase()} `
  return `${symbol}${(pence / 100).toFixed(2)}`
}

function intervalSuffix(pricing: Pricing | null): string {
  if (!pricing) return "mo"
  if (pricing.interval === "year") return "yr"
  if (pricing.interval === "month" && pricing.intervalCount === 6) return "6mo"
  return "mo"
}

function intervalWord(pricing: Pricing | null): string {
  if (!pricing) return "month"
  if (pricing.interval === "year") return "year"
  if (pricing.interval === "month" && pricing.intervalCount === 6) return "6 months"
  return "month"
}

/* ── HEADER ─────────────────────────────────────────────────────────────── */
function CheckoutHeader() {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.92)", borderBottom: "1px solid rgba(22,23,26,0.06)" }}>
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5">
        <Image src="/images/eatinoutlogo.webp" alt="EatinOut" width={640} height={150} priority className="h-[26px] w-auto" />
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--p-muted)]">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          Secure checkout
        </div>
      </div>
    </header>
  )
}

/* ── HERO ───────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <LoadReveal className="relative overflow-hidden rounded-[22px]" y={0} scale={1.02} duration={0.7}>
      <Image
        src="/images/prestonblog/moment-grill.png"
        alt="Friends enjoying a freshly cooked dinner at a warm, characterful local restaurant"
        width={1024}
        height={1024}
        priority
        className="h-[230px] w-full object-cover object-center sm:h-[260px] lg:h-[360px]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ backgroundImage: "linear-gradient(to top, rgba(10,10,10,0.70) 0%, rgba(10,10,10,0.10) 45%, rgba(10,10,10,0) 75%)" }}
      />
      <LoadReveal className="absolute bottom-4 left-5 right-5 sm:bottom-5 sm:left-6" y={10} delay={0.12}>
        <p className="text-white drop-shadow-sm" style={{ fontSize: "clamp(31px, 8.5vw, 40px)", fontWeight: 800, lineHeight: 0.98, letterSpacing: "-0.035em" }}>
          Eat out more.
          <br />
          <span className="relative inline-block" style={{ fontWeight: 850 }}>
            Pay less.
            <span aria-hidden="true" className="absolute -bottom-[5px] left-0 h-[3px] w-full rounded-full" style={{ background: "var(--p-red)" }} />
          </span>
        </p>
        <p className="mt-2.5 text-sm sm:text-[15px]" style={{ fontWeight: 600, color: "rgba(255,255,255,0.90)" }}>
          Save up to 50% at restaurants near you.
        </p>
      </LoadReveal>
      <LoadReveal className="absolute right-4 top-4" y={8} delay={0.26}>
        <div className="rounded-xl px-3 py-2 text-center backdrop-blur-md" style={{ background: "rgba(255,255,255,0.94)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          <span className="block text-[9px] uppercase text-[var(--p-red)]" style={{ fontWeight: 800, letterSpacing: "0.12em" }}>EatinOut offer</span>
          <span className="mt-0.5 block text-[15px] font-extrabold leading-none text-[var(--p-ink)]">Up to 50% off</span>
        </div>
      </LoadReveal>
    </LoadReveal>
  )
}

function Intro() {
  return (
    <ViewReveal className="pt-1">
      <h1 className="max-w-[380px] text-pretty font-extrabold" style={{ fontSize: "clamp(30px, 7.2vw, 35px)", lineHeight: 1.03, letterSpacing: "-0.035em" }}>
        <span className="text-[var(--p-ink)]">Your next meal could </span>
        <span className="text-[var(--p-red)]">pay for your membership.</span>
      </h1>
      <p className="mt-3.5 max-w-md text-[17px] text-[var(--p-body)]" style={{ lineHeight: 1.48 }}>
        Try EatinOut free for <span className="font-bold text-[var(--p-ink)]">30 days</span> and start saving at{" "}
        <span className="font-bold text-[var(--p-ink)]">500+ restaurants, cafés and bars</span>.
      </p>
    </ViewReveal>
  )
}

function ProofStrip() {
  return (
    <ViewReveal className="grid grid-cols-3 rounded-2xl bg-[var(--p-surface)]" style={{ border: "1px solid rgba(22,23,26,0.07)" }} y={8}>
      <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
        <span className="flex" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-[var(--p-gold)] text-[var(--p-gold)]" />
          ))}
        </span>
        <span className="text-[21px] font-extrabold leading-none text-[var(--p-ink)]">4.8</span>
        <span className="text-[11px] font-medium text-[var(--p-muted)]">Members</span>
      </div>
      <div className="flex flex-col items-center justify-center gap-1 px-2 py-4 text-center" style={{ borderInline: "1px solid var(--p-border)" }}>
        <span className="text-[21px] font-extrabold leading-none text-[var(--p-red)]">500+</span>
        <span className="text-[11px] font-medium text-[var(--p-muted)]">Places to save</span>
      </div>
      <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
        <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "var(--p-sage-bg)" }} aria-hidden="true">
          <Check className="h-3.5 w-3.5 text-[var(--p-sage)]" />
        </span>
        <span className="text-lg font-extrabold leading-none text-[var(--p-ink)]">Anytime</span>
        <span className="text-[11px] font-medium text-[var(--p-muted)]">Cancel</span>
      </div>
    </ViewReveal>
  )
}

function ValuePanel() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4"
        style={{ backgroundImage: "radial-gradient(circle at 85% 25%, rgba(217,4,41,0.045), transparent 35%), radial-gradient(circle at 0% 60%, rgba(194,140,50,0.035), transparent 32%)" }}
      />
      <ViewReveal
        className="relative rounded-[24px] p-6"
        y={12}
        style={{ backgroundImage: "linear-gradient(135deg, #FFF8F3 0%, #FFFFFF 52%, #FFF0F3 100%)", border: "1px solid rgba(217,4,41,0.08)", boxShadow: "0 18px 50px rgba(40,30,25,0.07)" }}
      >
        <p className="text-[11px] uppercase text-[var(--p-red)]" style={{ fontWeight: 800, letterSpacing: "0.14em" }}>Why it&apos;s worth it</p>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <p className="leading-[0.9] text-[var(--p-ink)]" style={{ fontSize: "clamp(52px, 15vw, 56px)", fontWeight: 850, letterSpacing: "-0.045em" }}>£0</p>
            <p className="mt-1.5 text-[11px] uppercase text-[var(--p-red)]" style={{ fontWeight: 800, letterSpacing: "0.1em" }}>Today</p>
            <p className="mt-2 text-sm font-bold text-[var(--p-ink)]">30 days completely free</p>
          </div>
          <div className="flex h-[108px] w-[108px] shrink-0 flex-col items-center justify-center rounded-full text-center" style={{ background: "var(--p-blush-strong)" }}>
            <span className="text-[10px] uppercase text-[var(--p-red)]" style={{ fontWeight: 800, letterSpacing: "0.06em" }}>Up to</span>
            <span className="text-[34px] leading-none text-[var(--p-red)]" style={{ fontWeight: 850, letterSpacing: "-0.02em" }}>50%</span>
            <span className="text-[10px] uppercase text-[var(--p-red)]" style={{ fontWeight: 800, letterSpacing: "0.06em" }}>Off</span>
          </div>
        </div>
        <div className="my-6 h-px" style={{ background: "var(--p-border)" }} />
        <p className="text-[15px] font-semibold text-[var(--p-ink)]">One dinner can make the membership feel tiny.</p>
        <StaggerGroup className="mt-4 flex items-center gap-3" stagger={0.09}>
          <StaggerItem className="flex-1 rounded-xl bg-white px-3 py-3 text-center" style={{ border: "1px solid rgba(25,23,21,0.07)" }}>
            <span className="block text-[11px] font-medium text-[var(--p-muted)]">£50 dinner</span>
            <span className="mt-1 block text-[21px] font-extrabold text-[var(--p-ink)]">£50</span>
          </StaggerItem>
          <ArrowRight className="h-5 w-5 shrink-0 text-[var(--p-arrow)]" aria-hidden="true" />
          <StaggerItem className="flex-1 rounded-xl px-3 py-3 text-center" style={{ background: "var(--p-blush)", border: "1px solid rgba(217,4,41,0.12)" }}>
            <span className="block text-[11px] font-bold text-[var(--p-red)]">Up to saved*</span>
            <span className="mt-1 block text-[25px] leading-none text-[var(--p-red)]" style={{ fontWeight: 850 }}>£25</span>
          </StaggerItem>
        </StaggerGroup>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-sm text-[var(--p-body)]">Membership after trial</span>
          <span className="text-[20px] text-[var(--p-ink)]">
            <span style={{ fontWeight: 850 }}>£4.99</span>
            <span className="text-[var(--p-body)]" style={{ fontWeight: 600 }}>/month</span>
          </span>
        </div>
        <div className="mt-5 flex items-stretch gap-3">
          <span aria-hidden="true" className="w-[3px] shrink-0 rounded-full" style={{ background: "var(--p-red)" }} />
          <p className="text-[13px] text-[var(--p-ink)]" style={{ fontWeight: 650, lineHeight: 1.45 }}>One good saving can cover several months of membership.</p>
        </div>
        <p className="mt-4 text-[11px] text-[var(--p-muted)]" style={{ lineHeight: 1.4 }}>*Illustrative example using a participating 50% offer.</p>
      </ViewReveal>
    </div>
  )
}

function SocialProof() {
  return (
    <ViewReveal className="flex items-center gap-4" y={8}>
      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full shadow-sm" style={{ border: "3px solid #FFF8F3", boxShadow: "0 4px 14px rgba(40,30,25,0.10)" }}>
        <Image src="/testimonial-emma-davies.webp" alt="EatinOut member" fill sizes="48px" className="object-cover" />
      </span>
      <div>
        <span className="flex items-center gap-2">
          <span className="flex" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-[var(--p-gold)] text-[var(--p-gold)]" />
            ))}
          </span>
          <span className="text-[13px] text-[var(--p-body)]">
            Rated <span className="font-bold text-[var(--p-ink)]">4.8</span> by <span className="font-bold text-[var(--p-ink)]">EatinOut members</span>
          </span>
        </span>
        <p className="mt-1 text-[16px] font-bold text-[var(--p-ink)]">&ldquo;Saved £27 on our first meal.&rdquo;</p>
      </div>
    </ViewReveal>
  )
}

function CheckoutTransition() {
  return (
    <div className="text-center">
      <h2 className="text-[25px] font-extrabold" style={{ letterSpacing: "-0.025em" }}>
        <span className="text-[var(--p-ink)]">Ready to start </span>
        <span className="text-[var(--p-red)]">saving?</span>
      </h2>
      <p className="mt-1.5 text-sm text-[var(--p-body)]">
        Join in seconds. <span className="font-bold text-[var(--p-ink)]">£0 charged today.</span>
      </p>
    </div>
  )
}

/* ── Static "Country" field — locked to United Kingdom ─────────────────── */
function StaticCountryField() {
  return (
    <div>
      <span className="mb-1.5 block text-[12px] text-[var(--p-body)]" style={{ fontWeight: 650 }}>
        Country
      </span>
      <div
        aria-hidden="true"
        className="flex h-[52px] items-center rounded-xl px-3.5 text-sm"
        style={{
          background: "var(--p-field)",
          border: "1px solid rgba(25,23,21,0.12)",
          color: "var(--p-ink)",
        }}
      >
        United Kingdom
      </div>
    </div>
  )
}

/* ── Card fields — split Stripe elements, exact client design ────────────
 * Uses CardNumberElement / CardExpiryElement / CardCvcElement instead of
 * the unified PaymentElement, because only the split elements let us set
 * our own labels ("Expiry" / "CVC"), our own placeholders, and hide the
 * dynamic brand-detection icon in favour of a single generic card icon —
 * none of which the unified PaymentElement exposes.
 * ------------------------------------------------------------------- */
function CardFields() {
  const elements = useElements()
  const [focusedField, setFocusedField] = useState<"number" | "expiry" | "cvc" | null>(null)

  const fieldBoxStyle = (isFocused: boolean): React.CSSProperties =>
    isFocused
      ? {
          background: "var(--p-field)",
          border: "1px solid var(--p-red)",
          boxShadow: "0 0 0 3px rgba(217,4,41,0.08)",
        }
      : {
          background: "var(--p-field)",
          border: "1px solid rgba(25,23,21,0.12)",
        }

  const handleNumberChange = (event: StripeCardNumberElementChangeEvent) => {
    if (event.error) console.warn("[checkout][debug][card] number field error:", event.error.message)
    if (event.complete) {
      elements?.getElement(CardExpiryElement)?.focus()
    }
  }

  const handleExpiryChange = (event: StripeCardExpiryElementChangeEvent) => {
    if (event.error) console.warn("[checkout][debug][card] expiry field error:", event.error.message)
    if (event.complete) {
      elements?.getElement(CardCvcElement)?.focus()
    }
  }

  return (
    <section aria-label="Card payment details" className="space-y-3">
      {/* Card number */}
      <div>
        <span className="mb-1.5 block text-[12px] text-[var(--p-body)]" style={{ fontWeight: 650 }}>
          Card number
        </span>
        <div
          className="flex h-[52px] items-center justify-between rounded-xl px-3.5 transition-all duration-150"
          style={fieldBoxStyle(focusedField === "number")}
        >
          <div className="flex-1">
            <CardNumberElement
              options={{
                style: STRIPE_ELEMENT_STYLE,
                placeholder: "1234 1234 1234 1234",
                showIcon: false,
              }}
              onFocus={() => setFocusedField("number")}
              onBlur={() => setFocusedField((f) => (f === "number" ? null : f))}
              onChange={handleNumberChange}
            />
          </div>
          <CreditCard className="h-4 w-4 shrink-0 text-[var(--p-muted)]/60" aria-hidden="true" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Expiry */}
        <div>
          <span className="mb-1.5 block text-[12px] text-[var(--p-body)]" style={{ fontWeight: 650 }}>
            Expiry
          </span>
          <div
            className="flex h-[52px] items-center rounded-xl px-3.5 transition-all duration-150"
            style={fieldBoxStyle(focusedField === "expiry")}
          >
            <div className="w-full">
              <CardExpiryElement
                options={{ style: STRIPE_ELEMENT_STYLE }}
                onFocus={() => setFocusedField("expiry")}
                onBlur={() => setFocusedField((f) => (f === "expiry" ? null : f))}
                onChange={handleExpiryChange}
              />
            </div>
          </div>
        </div>

        {/* CVC */}
        <div>
          <span className="mb-1.5 block text-[12px] text-[var(--p-body)]" style={{ fontWeight: 650 }}>
            CVC
          </span>
          <div
            className="flex h-[52px] items-center rounded-xl px-3.5 transition-all duration-150"
            style={fieldBoxStyle(focusedField === "cvc")}
          >
            <div className="w-full">
              <CardCvcElement
                options={{ style: STRIPE_ELEMENT_STYLE, placeholder: "123" }}
                onFocus={() => setFocusedField("cvc")}
                onBlur={() => setFocusedField((f) => (f === "cvc" ? null : f))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* static Country field — always United Kingdom, not editable */}
      <StaticCountryField />
    </section>
  )
}

/* ── LIVE CHECKOUT CARD — Stripe wired, card + wallets, UK-locked ───────── */
function LiveCheckoutCardInner({
  clientSecret,
  mode,
  postcode,
  pricing,
  onSuccess,
  onReapply,
}: {
  clientSecret: string | null
  mode: "setup" | "payment"
  postcode?: string
  pricing: Pricing | null
  onSuccess: () => Promise<void>
  onReapply: (voucherCode: string) => Promise<void>
}) {
  const stripe = useStripe()
  const elements = useElements()

  const [voucher, setVoucher] = useState("")
  const [voucherStatus, setVoucherStatus] = useState<null | { valid: boolean; label?: string; message?: string }>(null)
  const [isCheckingVoucher, setIsCheckingVoucher] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Express Checkout Element state ──────────────────────────────────
  // Stripe alone decides what's available on this browser/device via the
  // onReady event's `availablePaymentMethods` — we never guess ourselves.
  // Nothing is rendered until Stripe reports back, and nothing is shown
  // if no wallet is usable — no static fallback, no "unavailable" popup.
  const [expressReady, setExpressReady] = useState(false)
  const [hasAvailableWallet, setHasAvailableWallet] = useState(false)

  // Voucher reapply / async updates can change clientSecret & mode after
  // ExpressCheckoutElement has already mounted — the onConfirm callback
  // must always read the latest values, hence refs.
  const clientSecretRef = useRef(clientSecret)
  const modeRef = useRef(mode)
  useEffect(() => {
    clientSecretRef.current = clientSecret
    modeRef.current = mode
  }, [clientSecret, mode])

  // Keep the Express Checkout Element's amount/currency in sync with the
  // real Stripe pricing (e.g. after a voucher discount is applied), without
  // remounting Elements — elements.update() is the officially supported
  // way to do this for a "deferred" Elements instance.
  useEffect(() => {
    if (!elements || mode !== "payment" || !pricing) return
    elements.update({ amount: pricing.discountedAmount ?? pricing.baseAmount })
  }, [elements, mode, pricing])

  // ── DEBUG: this is the exact set of conditions the submit button's
  // `disabled` prop checks. Whichever one logs false/null is your culprit.
  useEffect(() => {
    console.log("[checkout][debug][button-state]", {
      isSubmitting,
      stripeReady: !!stripe,
      elementsReady: !!elements,
      clientSecret: clientSecret ? `present (${clientSecret.slice(0, 12)}...)` : null,
      willBeDisabled: isSubmitting || !stripe || !elements || !clientSecret,
    })
  }, [isSubmitting, stripe, elements, clientSecret])

  const applyVoucher = async () => {
    if (!voucher.trim()) return
    setIsCheckingVoucher(true)
    setVoucherStatus(null)
    try {
      console.log("[checkout][debug][voucher] validating:", voucher.trim())
      const res = await fetch("/api/payment/validate-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucher.trim() }),
      })
      const data = await res.json()
      console.log("[checkout][debug][voucher] response:", res.status, data)
      setVoucherStatus(data)
      if (data.valid) {
        await onReapply(voucher.trim())
      }
    } catch (err) {
      console.error("[checkout][debug][voucher] request failed:", err)
      setVoucherStatus({ valid: false, message: "Could not validate code" })
    } finally {
      setIsCheckingVoucher(false)
    }
  }

  const confirm = async () => {
    console.log("[checkout][debug][confirm] clicked. stripe:", !!stripe, "elements:", !!elements, "clientSecret:", !!clientSecret)
    if (!stripe || !elements || !clientSecret) {
      console.warn("[checkout][debug][confirm] aborting — missing stripe/elements/clientSecret")
      return
    }
    const cardNumberElement = elements.getElement(CardNumberElement)
    if (!cardNumberElement) {
      console.warn("[checkout][debug][confirm] aborting — CardNumberElement not mounted")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const paymentMethodParams = {
      card: cardNumberElement,
      billing_details: {
        address: {
          country: "GB",
          ...(postcode ? { postal_code: postcode } : {}),
        },
      },
    }

    const { error: confirmError } =
      mode === "setup"
        ? await stripe.confirmCardSetup(clientSecret, { payment_method: paymentMethodParams })
        : await stripe.confirmCardPayment(clientSecret, { payment_method: paymentMethodParams })

    if (confirmError) {
      console.error("[checkout][debug][confirm] Stripe confirm error:", confirmError)
      setIsSubmitting(false)
      setError(confirmError.message || "Payment failed. Please check your details and try again.")
      return
    }

    console.log("[checkout][debug][confirm] success, calling onSuccess()")
    // Stay in "Processing..." until we navigate away (no button flicker)
    await onSuccess()
  }

  // ── Express Checkout (Apple Pay / Google Pay / etc.) confirm handler ──
  // Uses the SAME clientSecret our own backend already created (via
  // create-subscription), so the entire downstream flow — webhook,
  // verify-subscription, DB activation, emails — is completely unchanged.
  // elements.submit() + stripe.confirmSetup/confirmPayment({ elements,
  // clientSecret, ... }) is Stripe's documented "deferred" pattern for
  // when you already have your own PaymentIntent/SetupIntent.
  const handleExpressConfirm = async () => {
    const secret = clientSecretRef.current
    const currentMode = modeRef.current

    if (!stripe || !elements) {
      console.warn("[checkout][debug][express] aborting — stripe/elements not ready")
      return
    }
    if (!secret) {
      setError("Checkout is still loading. Please try again in a moment.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      console.error("[checkout][debug][express] elements.submit() error:", submitError)
      setIsSubmitting(false)
      setError(submitError.message || "Payment failed. Please try again.")
      return
    }

    const result =
      currentMode === "setup"
        ? await stripe.confirmSetup({ elements, clientSecret: secret, redirect: "if_required" })
        : await stripe.confirmPayment({ elements, clientSecret: secret, redirect: "if_required" })

    if (result.error) {
      console.error("[checkout][debug][express] confirm error:", result.error)
      setIsSubmitting(false)
      setError(result.error.message || "Payment failed. Please try another card or method.")
      return
    }

    console.log("[checkout][debug][express] success, calling onSuccess()")
    await onSuccess()
  }

  const isTrialing = mode === "setup"
  const currency = pricing?.currency ?? "gbp"
  const renewalAmount = pricing?.discountedAmount ?? pricing?.baseAmount ?? 0
  const todayAmount = isTrialing ? 0 : renewalAmount
  const suffix = intervalSuffix(pricing)
  const word = intervalWord(pricing)
  const renewalText = pricing ? formatMoney(renewalAmount, currency) : "—"

  return (
    <>
      {/* final financial confirmation */}
      <div className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 ${pricing ? "" : "animate-pulse"}`} style={{ backgroundImage: "linear-gradient(90deg, #FFF8F3 0%, #FFF0F3 100%)" }}>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--p-muted)]">Today</p>
          <p className="text-[24px] leading-tight text-[var(--p-red)]" style={{ fontWeight: 850 }}>
            {formatMoney(todayAmount, currency)}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--p-arrow)]" aria-hidden="true" />
        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--p-muted)]">
            {isTrialing ? "After 30 days" : "Renews at"}
          </p>
          <p className="text-[22px] leading-tight text-[var(--p-ink)]" style={{ fontWeight: 850 }}>
            {renewalText}
            <span className="text-sm text-[var(--p-body)]" style={{ fontWeight: 600 }}>/{suffix}</span>
          </p>
        </div>
      </div>

      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[13px] text-[var(--p-sage)]" style={{ fontWeight: 650 }}>
        <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: "var(--p-sage-bg)" }} aria-hidden="true">
          <Check className="h-2.5 w-2.5 text-[var(--p-sage)]" />
        </span>
        Cancel anytime
      </p>

      {/* express — Apple Pay / Google Pay via Stripe's own Express Checkout
          Element. Nothing renders until Stripe's onReady fires, and nothing
          renders if no wallet is usable on this exact browser/device —
          Stripe alone decides this, we never guess or fall back to a
          static button. */}
      {expressReady && hasAvailableWallet && (
        <>
          <div className="mt-6">
            <h3 className="text-[17px] font-extrabold text-[var(--p-ink)]">Fastest way to join</h3>
            <p className="mt-0.5 text-[13px] text-[var(--p-red)]" style={{ fontWeight: 650 }}>No charge today.</p>
            <div className="mt-3" style={{ opacity: isSubmitting ? 0.6 : 1, pointerEvents: isSubmitting ? "none" : "auto" }}>
              <ExpressCheckoutElement
                onConfirm={handleExpressConfirm}
                onReady={() => {
                  /* second onReady after the initial availability check — no-op */
                }}
                options={{
                  paymentMethods: {
                    applePay: "auto",
                    googlePay: "auto",
                    link: "never",
                    paypal: "never",
                    amazonPay: "never",
                    klarna: "never",
                  },
                  buttonType: { applePay: "plain", googlePay: "plain" },
                  buttonTheme: { applePay: "black", googlePay: "white" },
                  buttonHeight: 48,
                  layout: { maxColumns: 1, maxRows: 2 },
                } as any}
              />
            </div>
          </div>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1" style={{ background: "var(--p-border)" }} />
            <span className="text-xs font-medium text-[var(--p-muted)]">or pay with card</span>
            <span className="h-px flex-1" style={{ background: "var(--p-border)" }} />
          </div>
        </>
      )}

      {/* This is rendered unconditionally (even before Stripe's onReady
          fires) purely to receive the initial onReady/onAvailablePaymentMethodsChange
          event — hidden via height 0 until we know whether to show it, so
          Stripe can still do its detection work in the background without
          any layout flash. Once we know the result, the visible block above
          takes over and this one is skipped (Stripe Elements does not allow
          two ExpressCheckoutElement instances mounted twice for the same
          purpose, so this pattern uses a single instance whose visibility
          is controlled by wrapping height, not by mount/unmount). */}
      {!expressReady && (
        <div className="mt-6" style={{ height: 0, overflow: "hidden" }}>
          <ExpressCheckoutElement
            onReady={(event: any) => {
              console.log("[checkout][debug][express] ready. availablePaymentMethods:", event?.availablePaymentMethods)
              const available = event?.availablePaymentMethods
              const anyAvailable = !!available && Object.values(available).some(Boolean)
              setHasAvailableWallet(anyAvailable)
              setExpressReady(true)
            }}
            onConfirm={handleExpressConfirm}
            options={{
              paymentMethods: {
                applePay: "auto",
                googlePay: "auto",
                link: "never",
                paypal: "never",
                amazonPay: "never",
                klarna: "never",
              },
              buttonType: { applePay: "plain", googlePay: "plain" },
              buttonTheme: { applePay: "black", googlePay: "white" },
              buttonHeight: 48,
              layout: { maxColumns: 1, maxRows: 2 },
            } as any}
          />
        </div>
      )}

      {/* card fields — split elements, matching client's exact design */}
      <CardFields />

      {/* voucher code */}
      <div className="mt-4">
        <label className="mb-1.5 block text-[12px] text-[var(--p-body)]" style={{ fontWeight: 650 }}>
          Voucher code
        </label>
        <div className="flex gap-2">
          <input
            value={voucher}
            onChange={(e) => setVoucher(e.target.value)}
            placeholder="Voucher code"
            className="flex-1 h-12 rounded-xl px-3.5 text-sm outline-none"
            style={{ background: "var(--p-field)", border: "1px solid rgba(25,23,21,0.12)", color: "var(--p-ink)" }}
          />
          <button
            type="button"
            onClick={applyVoucher}
            disabled={isCheckingVoucher || isSubmitting || !voucher.trim()}
            className="h-12 px-4 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ border: "1px solid rgba(25,23,21,0.12)", color: "var(--p-ink)" }}
          >
            {isCheckingVoucher ? "Checking..." : "Apply"}
          </button>
        </div>
        {voucherStatus && (
          <p className="mt-1.5 text-xs" style={{ color: voucherStatus.valid ? "var(--p-sage)" : "var(--p-red)" }}>
            {voucherStatus.valid ? `Applied: ${voucherStatus.label}` : voucherStatus.message}
          </p>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm rounded-lg px-3 py-2" style={{ color: "var(--p-red)", background: "var(--p-blush)", border: "1px solid rgba(217,4,41,0.15)" }}>
          {error}
        </p>
      )}

      {/* CTA */}
      <div className="mt-5">
        <button
          type="button"
          onClick={confirm}
          disabled={isSubmitting || !stripe || !elements || !clientSecret}
          style={{ boxShadow: "0 12px 28px rgba(217,4,41,0.20)", letterSpacing: "-0.01em", background: "var(--p-red)" }}
          className="group flex h-[58px] w-full items-center justify-center gap-2 rounded-2xl px-6 text-[17px] font-extrabold text-white transition-all duration-150 hover:opacity-95 disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Start saving &mdash; £0 today
              <ArrowRight className="h-5 w-5 text-white/90 transition-transform duration-150 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
            </>
          )}
        </button>

        <p className="mt-3 text-center text-xs">
          <span className="font-bold text-[var(--p-ink)]">30 days free</span>
          <span className="text-[var(--p-sep)]"> &bull; </span>
          <span className="text-[var(--p-body)]">
            Then {renewalText}/{word}
          </span>
          <span className="text-[var(--p-sep)]"> &bull; </span>
          <span className="text-[var(--p-sage)]" style={{ fontWeight: 650 }}>Cancel anytime</span>
        </p>
      </div>

      {/* trust footer */}
      <div className="mt-5 border-t pt-4 text-center" style={{ borderColor: "var(--p-border)" }}>
        <p className="flex items-center justify-center gap-1.5 text-[13px] text-[var(--p-body)]">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--p-muted)]" aria-hidden="true" />
          Payments secured by <span className="font-bold text-[var(--p-ink)]">Stripe</span>
        </p>
        <p className="mt-1 text-[12px] text-[var(--p-muted)]">Bank verification may be required.</p>
      </div>
    </>
  )
}

function LiveCheckoutCard({
  clientSecret,
  mode,
  postcode,
  pricing,
  onSuccess,
  onReapply,
}: {
  clientSecret: string | null
  mode: "setup" | "payment"
  postcode?: string
  pricing: Pricing | null
  onSuccess: () => Promise<void>
  onReapply: (voucherCode: string) => Promise<void>
}) {
  // "Deferred" Elements setup: initialize with mode/currency(/amount) so
  // ExpressCheckoutElement can render and detect wallets immediately,
  // without waiting for (or being tied to) our own backend's clientSecret.
  // The actual confirm step below still uses OUR real clientSecret from
  // create-subscription — this only controls what the Express Checkout UI
  // needs to know to display correctly. Defaults to "setup" (the common
  // case, £0 trial) until the real mode is known, so no amount is ever
  // required at first mount; if the real mode differs, the `key` below
  // forces a clean remount once it's known (near-instant, before the user
  // can interact with anything).
  const currency = (pricing?.currency ?? "gbp").toLowerCase()
  const amount = pricing?.discountedAmount ?? pricing?.baseAmount ?? 0

 const elementsOptions =
  mode === "payment"
    ? { mode: "payment" as const, currency, amount: amount || 1, paymentMethodTypes: ["card", "apple_pay", "google_pay"] }
    : { mode: "setup" as const, currency, paymentMethodTypes: ["card", "apple_pay", "google_pay"] }

  return (
    <ViewReveal
      className="rounded-[26px] bg-[var(--p-surface)] p-5"
      y={12}
      style={{ border: "1px solid rgba(25,23,21,0.07)", boxShadow: "0 22px 60px rgba(40,30,25,0.09)" }}
    >
      <Elements stripe={stripePromise} options={elementsOptions} key={mode}>
        <LiveCheckoutCardInner
          clientSecret={clientSecret}
          mode={mode}
          postcode={postcode}
          pricing={pricing}
          onSuccess={onSuccess}
          onReapply={onReapply}
        />
      </Elements>
    </ViewReveal>
  )
}

/* ── ASSEMBLED LIVE CHECKOUT ────────────────────────────────────────────── */
export function EatinOutCheckoutLive() {
  const router = useRouter()
  const { user, authLoading } = useAuth()
  const [checkoutData, setCheckoutData] = useState<{ clientSecret: string; mode: "setup" | "payment" } | null>(null)
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null)
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [postcode, setPostcode] = useState<string | undefined>(undefined)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [paymentDone, setPaymentDone] = useState(false)
  const initStartedRef = useRef(false)

  const fetchSubscription = async (userEmail: string, voucherCode?: string) => {
    const priceId = sessionStorage.getItem("selectedPriceId") || undefined
    const referral = sessionStorage.getItem("checkoutReferral") || undefined

    console.log("[checkout][debug][fetchSubscription] request:", { userEmail, priceId, referral, voucherCode })

    const response = await fetch("/api/payment/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, priceId, referral, voucherCode }),
    })
    const data = await response.json()

    console.log("[checkout][debug][fetchSubscription] response:", response.status, data)

    if (!response.ok) throw new Error(data.error || "Failed to start checkout")
    return data
  }

  useEffect(() => {
    const cachedEmail = sessionStorage.getItem("checkoutEmail")
    // Sign-up / sign-in flow already knows the email, so don't wait for auth.
    // Only wait for auth when we need the logged-in user's email as a fallback.
    if (!cachedEmail && authLoading) return
    if (initStartedRef.current) return

    const storedEmail = cachedEmail || user?.email
    console.log("[checkout][debug][init] checkout email:", storedEmail)

    if (!storedEmail) {
      console.warn("[checkout][debug][init] no checkoutEmail and no logged-in user — redirecting to /sign-in.")
      router.replace("/sign-in?redirect=/checkout")
      return
    }

    initStartedRef.current = true
    sessionStorage.setItem("checkoutEmail", storedEmail)
    setEmail(storedEmail)
    setPostcode(sessionStorage.getItem("checkoutPostcode") || undefined)

    // Show the selected plan's known price right away; replaced by real Stripe pricing below
    const localPriceId = sessionStorage.getItem("selectedPriceId")
    if (localPriceId && KNOWN_PLANS[localPriceId]) setPricing(KNOWN_PLANS[localPriceId])

    fetchSubscription(storedEmail)
      .then((data) => {
        console.log("[checkout][debug][init] subscription created OK:", {
          hasClientSecret: !!data.clientSecret,
          mode: data.mode,
          subscriptionId: data.subscriptionId,
          pricing: data.pricing,
        })
        setCheckoutData({ clientSecret: data.clientSecret, mode: data.mode })
        setSubscriptionId(data.subscriptionId ?? null)
        setPricing(data.pricing ?? null)
      })
      .catch((err) => {
        console.error("[checkout][debug][init] fetchSubscription FAILED:", err)
        setLoadError(err.message || "Failed to start checkout")
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.email])

  const handleReapply = async (voucherCode: string) => {
    if (!email) return
    const data = await fetchSubscription(email, voucherCode)
    setCheckoutData({ clientSecret: data.clientSecret, mode: data.mode })
    setSubscriptionId(data.subscriptionId ?? null)
    setPricing(data.pricing ?? null)
  }

  const handleSuccess = async () => {
    setPaymentDone(true)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    try {
      // Server-side activation (same job the old verify-checkout-session did):
      // DB update, voucher save, Welcome + Confirmation emails, fresh auth cookie.
      await fetch("/api/payment/verify-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
        signal: controller.signal,
      })
    } catch (err) {
      console.error("[checkout][debug] Failed to verify subscription after checkout:", err)
      // Non-fatal: the Stripe webhook is the backup path
    } finally {
      clearTimeout(timer)
    }
    router.push("/success")
  }

  return (
    <div className="min-h-dvh text-[var(--p-ink)]" style={{ ...palette, background: "var(--p-bg)" }}>
      <CheckoutExitGuard active={!paymentDone} />

      <CheckoutHeader />

      <main className="mx-auto max-w-[1180px] px-5 py-7 sm:py-9">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <div className="flex flex-col gap-8 lg:w-[56%]">
            <Hero />
            <Intro />
            <ProofStrip />
            <ValuePanel />
            <SocialProof />
          </div>

          <div className="flex flex-col gap-5 lg:w-[40%] lg:shrink-0 lg:sticky lg:top-[88px]">
            <CheckoutTransition />

            {loadError ? (
              <div className="rounded-[26px] bg-white p-5 text-center" style={{ border: "1px solid rgba(217,4,41,0.2)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--p-red)" }}>{loadError}</p>
              </div>
            ) : (
              <LiveCheckoutCard
                clientSecret={checkoutData?.clientSecret ?? null}
                mode={checkoutData?.mode ?? "setup"}
                postcode={postcode}
                pricing={pricing}
                onSuccess={handleSuccess}
                onReapply={handleReapply}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}