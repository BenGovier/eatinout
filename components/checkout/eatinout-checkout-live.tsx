"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Lock, Check, ShieldCheck, Star, ArrowRight, Loader2, CreditCard } from "lucide-react"
import { loadStripe, type StripeCardNumberElementChangeEvent, type StripeCardExpiryElementChangeEvent, type StripeCardCvcElementChangeEvent } from "@stripe/stripe-js"
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import { LoadReveal, ViewReveal, StaggerGroup, StaggerItem } from "@/components/prototypes/eatinout-checkout/motion"
import { CheckoutExitGuard } from "./checkout-exit-guard"

// ── DEBUG: confirm the publishable key actually made it into the bundle ──
// If this logs "MISSING", loadStripe() will never resolve to a usable
// Stripe instance, `stripe` in useStripe() will stay null forever, and the
// CTA button will be disabled no matter what — on localhost AND on Vercel,
// unless you also add the env var to the Vercel project settings.
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

/* ── Static Apple Pay / Google Pay buttons ──────────────────────────────
 * Inert fallback — shown only when neither Apple Pay nor Google Pay is
 * available on the visitor's browser/device (e.g. desktop Firefox, or
 * Safari/Chrome with no card saved to the wallet). Preserves the exact
 * approved visual design for that case.
 * ------------------------------------------------------------------- */
function StaticWalletButtons() {
  return (
    <div className="flex flex-col gap-3">
      <div
        aria-hidden="true"
        className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-black text-base font-medium tracking-tight text-white shadow-sm"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M17.543 12.634c-.026-2.63 2.147-3.89 2.245-3.95-1.223-1.787-3.124-2.032-3.8-2.058-1.619-.164-3.16.955-3.98.955-.82 0-2.088-.931-3.434-.905-1.767.026-3.397 1.027-4.307 2.61-1.837 3.183-.469 7.895 1.318 10.48.874 1.266 1.916 2.687 3.281 2.636 1.315-.052 1.814-.852 3.404-.852 1.59 0 2.038.852 3.43.826 1.416-.026 2.313-1.29 3.181-2.559 1.001-1.469 1.414-2.892 1.44-2.965-.031-.013-2.765-1.062-2.792-4.21zM15.14 4.87c.726-.88 1.215-2.104 1.082-3.323-1.046.042-2.312.696-3.062 1.576-.673.78-1.262 2.025-1.104 3.22 1.166.09 2.358-.593 3.084-1.473z" />
        </svg>
        <span>Pay</span>
      </div>

      <div
        aria-hidden="true"
        className="flex h-12 items-center justify-center rounded-xl border border-black/10 bg-white text-base font-medium tracking-tight shadow-sm"
        style={{ color: "var(--p-ink)" }}
      >
        <span className="mr-1.5 font-bold">
          <span className="text-[#4285F4]">G</span>
          <span className="text-[#EA4335]">o</span>
          <span className="text-[#FBBC05]">o</span>
          <span className="text-[#4285F4]">g</span>
          <span className="text-[#34A853]">l</span>
          <span className="text-[#EA4335]">e</span>
        </span>
        Pay
      </div>
    </div>
  )
}

/* ── Real Apple Pay / Google Pay — wired to the same SetupIntent /
 * PaymentIntent flow as the card fields below.
 *
 * Stripe's PaymentRequestButtonElement automatically renders as an
 * Apple Pay button on Safari (with a card in the wallet) or a Google Pay
 * button on Chrome (with a card in the wallet) — it cannot show both
 * brand styles simultaneously, that decision is made by the browser/OS.
 * When neither wallet is available (desktop Firefox, no saved card,
 * etc.) we fall back to the exact static design so nothing looks broken.
 * ------------------------------------------------------------------- */
function ExpressWalletButtons({
  clientSecret,
  mode,
  pricing,
  onSuccess,
  onError,
}: {
  clientSecret: string | null
  mode: "setup" | "payment"
  pricing: Pricing | null
  onSuccess: () => Promise<void>
  onError: (message: string) => void
}) {
  const stripe = useStripe()
  const [paymentRequest, setPaymentRequest] = useState<any>(null)
  const [canUseWallet, setCanUseWallet] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Build (or rebuild) the Payment Request whenever pricing/mode changes —
  // e.g. after a voucher is applied and the renewal amount changes.
  useEffect(() => {
    if (!stripe) {
      console.log("[checkout][debug][wallet] stripe not ready yet, skipping paymentRequest build")
      return
    }

    const currency = pricing?.currency ?? "gbp"
    const renewalAmount = pricing?.discountedAmount ?? pricing?.baseAmount ?? 0
    // SetupIntent (free trial): Apple Pay / Google Pay support authorizing
    // a card for future use with a £0 request — nothing is charged today.
    const amount = mode === "setup" ? 0 : renewalAmount
    const label = mode === "setup" ? "EatinOut — 30 day free trial" : "EatinOut membership"

    console.log("[checkout][debug][wallet] building paymentRequest:", { currency, amount, mode })

    const pr = stripe.paymentRequest({
      country: "GB",
      currency,
      total: { label, amount },
      requestPayerName: true,
      requestPayerEmail: true,
    })

    let cancelled = false
    pr.canMakePayment().then((result: any) => {
      console.log("[checkout][debug][wallet] canMakePayment result:", result)
      if (!cancelled) setCanUseWallet(!!result)
    })

    setPaymentRequest(pr)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripe, mode, pricing?.discountedAmount, pricing?.baseAmount, pricing?.currency])

  useEffect(() => {
    if (!paymentRequest || !clientSecret || !stripe) return

    const handler = async (ev: any) => {
      setIsProcessing(true)

      const confirmParams = { payment_method: ev.paymentMethod.id }

      const result =
        mode === "setup"
          ? await stripe.confirmCardSetup(clientSecret, confirmParams, { handleActions: false })
          : await stripe.confirmCardPayment(clientSecret, confirmParams, { handleActions: false })

      if (result.error) {
        console.error("[checkout][debug][wallet] confirmCardSetup/Payment error:", result.error)
        ev.complete("fail")
        setIsProcessing(false)
        onError(result.error.message || "Payment failed. Please try again or use a card.")
        return
      }

      ev.complete("success")

      const intent: any = (result as any).setupIntent ?? (result as any).paymentIntent
      if (intent && intent.status === "requires_action") {
        const actionResult =
          mode === "setup"
            ? await stripe.confirmCardSetup(clientSecret)
            : await stripe.confirmCardPayment(clientSecret)

        if (actionResult.error) {
          console.error("[checkout][debug][wallet] requires_action follow-up error:", actionResult.error)
          setIsProcessing(false)
          onError(actionResult.error.message || "Payment failed. Please try again or use a card.")
          return
        }
      }

      await onSuccess()
    }

    paymentRequest.on("paymentmethod", handler)
    return () => {
      paymentRequest.off("paymentmethod", handler)
    }
  }, [paymentRequest, clientSecret, mode, stripe, onSuccess, onError])

  if (!canUseWallet || !paymentRequest || !clientSecret) {
    return <StaticWalletButtons />
  }

  return (
    <div style={{ opacity: isProcessing ? 0.6 : 1, pointerEvents: isProcessing ? "none" : "auto" }}>
      <PaymentRequestButtonElement
        options={{
          paymentRequest,
          style: {
            paymentRequestButton: {
              type: "default",
              theme: "dark",
              height: "48px",
            },
          },
        }}
      />
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

/* ── LIVE CHECKOUT CARD — Stripe wired, card-only, UK-locked ────────────── */
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
      <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5" style={{ backgroundImage: "linear-gradient(90deg, #FFF8F3 0%, #FFF0F3 100%)" }}>
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

      {/* express — real Apple Pay / Google Pay when available, static fallback otherwise */}
      <div className="mt-6">
        <h3 className="text-[17px] font-extrabold text-[var(--p-ink)]">Fastest way to join</h3>
        <p className="mt-0.5 text-[13px] text-[var(--p-red)]" style={{ fontWeight: 650 }}>No charge today.</p>
        <div className="mt-3">
          <ExpressWalletButtons
            clientSecret={clientSecret}
            mode={mode}
            pricing={pricing}
            onSuccess={onSuccess}
            onError={setError}
          />
        </div>
      </div>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1" style={{ background: "var(--p-border)" }} />
        <span className="text-xs font-medium text-[var(--p-muted)]">or pay with card</span>
        <span className="h-px flex-1" style={{ background: "var(--p-border)" }} />
      </div>

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
  return (
    <ViewReveal
      className="rounded-[26px] bg-[var(--p-surface)] p-5"
      y={12}
      style={{ border: "1px solid rgba(25,23,21,0.07)", boxShadow: "0 22px 60px rgba(40,30,25,0.09)" }}
    >
      <Elements stripe={stripePromise}>
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
  const [checkoutData, setCheckoutData] = useState<{ clientSecret: string; mode: "setup" | "payment" } | null>(null)
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null)
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [postcode, setPostcode] = useState<string | undefined>(undefined)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [paymentDone, setPaymentDone] = useState(false)

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
    const storedEmail = sessionStorage.getItem("checkoutEmail")
    console.log("[checkout][debug][init] checkoutEmail from sessionStorage:", storedEmail)

    if (!storedEmail) {
      console.warn("[checkout][debug][init] no checkoutEmail found — redirecting to /sign-up. " +
        "If you're opening this checkout page directly (not via the sign-up flow), this is why nothing loads.")
      router.replace("/sign-up")
      return
    }
    setEmail(storedEmail)
    setPostcode(sessionStorage.getItem("checkoutPostcode") || undefined)

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
  }, [])

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