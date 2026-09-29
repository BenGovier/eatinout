"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Lock, Check, ShieldCheck, ArrowRight, Loader2, CreditCard } from "lucide-react"
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
import { ViewReveal } from "@/components/prototypes/eatinout-checkout/motion"
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

/* ── INTRO ──────────────────────────────────────────────────────────────── */
// `isTrial` is null until create-subscription responds, so returning
// customers (mode "payment") never see free-trial wording.
function CheckoutIntro({ isTrial }: { isTrial: boolean | null }) {
  return (
    <div>
      <h1 className="text-pretty font-extrabold text-[var(--p-ink)]" style={{ fontSize: "clamp(24px, 6.4vw, 30px)", lineHeight: 1.08, letterSpacing: "-0.03em" }}>
        Your restaurant savings are <span className="text-[var(--p-red)]">ready.</span>
      </h1>
      <p className="mt-2 text-[15px] text-[var(--p-body)]" style={{ lineHeight: 1.45 }}>
        {isTrial ? (
          <>
            Start your <span className="font-bold text-[var(--p-ink)]">30-day free trial</span> and unlock offers at{" "}
          </>
        ) : (
          <>Unlock offers at </>
        )}
        <span className="font-bold text-[var(--p-ink)]">500+ restaurants, cafés and bars</span>.
      </p>
    </div>
  )
}

function WalletUnsupportedNotice({
  walletLabel,
  onClose,
}: {
  walletLabel: "Apple Pay" | "Google Pay"
  onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(25,23,21,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-6 text-center"
        style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[16px] font-extrabold text-[var(--p-ink)]">{walletLabel} isn&apos;t available</p>
        <p className="mt-2 text-[13px] text-[var(--p-body)]" style={{ lineHeight: 1.5 }}>
          Your device or browser doesn&apos;t support this payment method here. Please pay by card below instead.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-11 w-full rounded-xl text-sm font-semibold text-white"
          style={{ background: "var(--p-red)" }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}

/* ── LIVE Apple Pay / Google Pay ──────────────────────────────────────────
 * CHANGED: wallet support is now the OR of TWO official Stripe checks:
 *   1) ExpressCheckoutElement onReady -> availablePaymentMethods
 *   2) stripe.paymentRequest().canMakePayment()
 * If either reports a wallet as available, that button is shown.
 * No user-agent sniffing. Payment confirmation is unchanged and still goes
 * through paymentRequest.show().
 * ------------------------------------------------------------------- */
function WalletButtons({
  clientSecret,
  mode,
  pricing,
  onSuccess,
  onError,
  disabled,
}: {
  clientSecret: string | null
  mode: "setup" | "payment"
  pricing: Pricing | null
  onSuccess: () => Promise<void>
  onError: (message: string) => void
  disabled: boolean
}) {
  const stripe = useStripe()
  const [paymentRequest, setPaymentRequest] = useState<any>(null)

  // CHANGED: support now comes from two sources
  const [eceSupport, setEceSupport] = useState<{ applePay: boolean; googlePay: boolean } | null>(null)
  const [prSupport, setPrSupport] = useState<{ applePay: boolean; googlePay: boolean } | null>(null)

  const support =
    eceSupport === null && prSupport === null
      ? null
      : {
          applePay: !!(eceSupport?.applePay || prSupport?.applePay),
          googlePay: !!(eceSupport?.googlePay || prSupport?.googlePay),
        }

  const [isProcessing, setIsProcessing] = useState(false)
  const [unsupportedWallet, setUnsupportedWallet] = useState<null | "Apple Pay" | "Google Pay">(null)

  const secretRef = useRef(clientSecret)
  const modeRef = useRef(mode)
  const successRef = useRef(onSuccess)
  useEffect(() => {
    secretRef.current = clientSecret
    modeRef.current = mode
    successRef.current = onSuccess
  }, [clientSecret, mode, onSuccess])

  const amount = pricing?.discountedAmount ?? pricing?.baseAmount ?? 0
  const currency = (pricing?.currency ?? "gbp").toLowerCase()
  const isTrial = mode === "setup"
  const label = isTrial ? "EatinOut membership — £0 today, 30 days free" : "EatinOut membership"

  // Build the Payment Request object — needed to OPEN the wallet sheet and
  // confirm the SetupIntent/PaymentIntent on click. CHANGED: it also runs
  // canMakePayment() and feeds the result into `prSupport`.
  useEffect(() => {
    if (!stripe || !pricing) {
      console.log("[checkout][debug][wallet] skipping paymentRequest build — stripe or pricing not ready yet", { hasStripe: !!stripe, hasPricing: !!pricing })
      return
    }

    console.log("[checkout][debug][wallet] building paymentRequest object", { amount, currency, isTrial })
    const pr = stripe.paymentRequest({
      country: "GB",
      currency,
      total: { label, amount, pending: isTrial },
      requestPayerName: true,
      requestPayerEmail: true,
    })

    let cancelled = false
    pr.canMakePayment()
      .then((result: any) => {
        console.log("[checkout][debug][PR] canMakePayment result:", result)
        if (cancelled) return
        setPrSupport({ applePay: !!result?.applePay, googlePay: !!result && !result?.applePay })
      })
      .catch((err: any) => {
        console.error("[checkout][debug][PR] canMakePayment failed:", err)
        if (!cancelled) setPrSupport({ applePay: false, googlePay: false })
      })

    setPaymentRequest(pr)

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripe, pricing])

  useEffect(() => {
    if (!paymentRequest || !pricing) return
    paymentRequest.update({ currency, total: { label, amount, pending: isTrial } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentRequest, amount, currency, isTrial, label])

  useEffect(() => {
    if (!paymentRequest || !stripe) return

    const handler = async (ev: any) => {
      const secret = secretRef.current
      if (!secret) {
        ev.complete("fail")
        onError("Checkout is still loading. Please try again in a moment.")
        return
      }

      setIsProcessing(true)
      try {
        const result: any =
          modeRef.current === "setup"
            ? await stripe.confirmCardSetup(secret, { payment_method: ev.paymentMethod.id }, { handleActions: false })
            : await stripe.confirmCardPayment(secret, { payment_method: ev.paymentMethod.id }, { handleActions: false })

        if (result.error) {
          console.error("[checkout][debug][wallet] confirm error:", result.error)
          ev.complete("fail")
          setIsProcessing(false)
          onError(result.error.message || "Payment failed. Please try another card or method.")
          return
        }

        ev.complete("success")

        const intent = result.setupIntent ?? result.paymentIntent
        if (intent?.status === "requires_action") {
          const action: any =
            modeRef.current === "setup"
              ? await stripe.confirmCardSetup(secret)
              : await stripe.confirmCardPayment(secret)

          if (action.error) {
            console.error("[checkout][debug][wallet] requires_action follow-up error:", action.error)
            setIsProcessing(false)
            onError(action.error.message || "Bank verification failed. Please try again.")
            return
          }
        }

        console.log("[checkout][debug][wallet] success, calling onSuccess()")
        await successRef.current()
      } catch (err) {
        console.error("[checkout][debug][wallet] unexpected error:", err)
        try {
          ev.complete("fail")
        } catch {
          /* sheet already closed */
        }
        setIsProcessing(false)
        onError("Something went wrong. Please try again.")
      }
    }

    paymentRequest.on("paymentmethod", handler)
    return () => {
      paymentRequest.off("paymentmethod", handler)
    }
  }, [paymentRequest, stripe, onError])

  const handleClick = (wallet: "Apple Pay" | "Google Pay") => {
    console.log("[checkout][debug][wallet] button clicked:", wallet, "current support:", support, "disabled:", disabled, "isProcessing:", isProcessing, "hasClientSecret:", !!clientSecret)

    if (disabled || isProcessing || !clientSecret) return

    const supported = wallet === "Apple Pay" ? support?.applePay : support?.googlePay

    if (paymentRequest && supported) {
      try {
        console.log("[checkout][debug][wallet] calling paymentRequest.show() for", wallet)
        paymentRequest.show()
      } catch (err) {
        console.error("[checkout][debug][wallet] show() failed:", err)
        setUnsupportedWallet(wallet)
      }
    } else {
      console.warn("[checkout][debug][wallet] blocked — wallet not supported on this device/browser", { wallet, support })
      setUnsupportedWallet(wallet)
    }
  }

  // Still detecting (neither ECE onReady nor canMakePayment has answered yet)
  // → treat as busy so a click can't slip through before we know what's supported.
  const detecting = support === null
  const busy = disabled || isProcessing || !clientSecret || detecting

  return (
    <>
      {/* Hidden ExpressCheckoutElement — mounted ONLY so Stripe tells us,
          via onReady, which wallets this browser/device can use.
          CHANGED: 1px x 1px + opacity 0 (was 0 x 0) so Stripe's iframe
          loads properly. Never visible to the user. */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", width: "1px", height: "1px", opacity: 0, overflow: "hidden", pointerEvents: "none" }}
      >
        {pricing && (
          <ExpressCheckoutElement
            options={{
              paymentMethods: {
                applePay: "auto",
                googlePay: "auto",
                link: "never",
                paypal: "never",
                amazonPay: "never",
              },
            }}
            onReady={(event: any) => {
              console.log("[checkout][debug][ECE] full onReady event:", JSON.stringify(event))
              const applePay = !!event?.availablePaymentMethods?.applePay
              const googlePay = !!event?.availablePaymentMethods?.googlePay
              console.log("[checkout][debug][ECE] resolved support ->", { applePay, googlePay })
              setEceSupport({ applePay, googlePay })
            }}
            onLoadError={(event: any) => {
              console.error("[checkout][debug][ECE] onLoadError — ECE treats both wallets as unsupported:", event)
              setEceSupport({ applePay: false, googlePay: false })
            }}
          />
        )}
      </div>

      {detecting && (
        <p className="text-center text-[12px] text-[var(--p-muted)]">Checking available payment methods…</p>
      )}

      <div className="flex flex-col gap-3" style={{ opacity: busy ? 0.6 : 1 }}>
        {support?.applePay && (
          <button
            type="button"
            onClick={() => handleClick("Apple Pay")}
            disabled={busy}
            aria-label="Pay with Apple Pay"
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-black text-base font-medium tracking-tight text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M17.543 12.634c-.026-2.63 2.147-3.89 2.245-3.95-1.223-1.787-3.124-2.032-3.8-2.058-1.619-.164-3.16.955-3.98.955-.82 0-2.088-.931-3.434-.905-1.767.026-3.397 1.027-4.307 2.61-1.837 3.183-.469 7.895 1.318 10.48.874 1.266 1.916 2.687 3.281 2.636 1.315-.052 1.814-.852 3.404-.852 1.59 0 2.038.852 3.43.826 1.416-.026 2.313-1.29 3.181-2.559 1.001-1.469 1.414-2.892 1.44-2.965-.031-.013-2.765-1.062-2.792-4.21zM15.14 4.87c.726-.88 1.215-2.104 1.082-3.323-1.046.042-2.312.696-3.062 1.576-.673.78-1.262 2.025-1.104 3.22 1.166.09 2.358-.593 3.084-1.473z" />
            </svg>
            <span>Pay</span>
          </button>
        )}

        {support?.googlePay && (
          <button
            type="button"
            onClick={() => handleClick("Google Pay")}
            disabled={busy}
            aria-label="Pay with Google Pay"
            className="flex h-12 items-center justify-center rounded-xl border border-black/10 bg-white text-base font-medium tracking-tight shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed"
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
          </button>
        )}
      </div>

      {unsupportedWallet && (
        <WalletUnsupportedNotice walletLabel={unsupportedWallet} onClose={() => setUnsupportedWallet(null)} />
      )}
    </>
  )
}

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

      <StaticCountryField />
    </section>
  )
}

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
    await onSuccess()
  }

  const handleWalletSuccess = async () => {
    setIsSubmitting(true)
    await onSuccess()
  }

  const handleWalletError = (message: string) => {
    setError(message)
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

      <div className="mt-6">
        <h3 className="text-[17px] font-extrabold text-[var(--p-ink)]">Fastest way to join</h3>
        <p className="mt-0.5 text-[13px] text-[var(--p-red)]" style={{ fontWeight: 650 }}>No charge today.</p>
        <div className="mt-3">
          <WalletButtons
            clientSecret={clientSecret}
            mode={mode}
            pricing={pricing}
            onSuccess={handleWalletSuccess}
            onError={handleWalletError}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1" style={{ background: "var(--p-border)" }} />
        <span className="text-xs font-medium text-[var(--p-muted)]">or pay with card</span>
        <span className="h-px flex-1" style={{ background: "var(--p-border)" }} />
      </div>

      <CardFields />

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
  // Elements receives `options` with mode/amount/currency. This is required
  // for <ExpressCheckoutElement> (used inside WalletButtons for detection)
  // to mount at all — without it Stripe throws.
  const renewalAmount = pricing?.discountedAmount ?? pricing?.baseAmount ?? 0
  const currency = (pricing?.currency ?? "gbp").toLowerCase()

  console.log("[checkout][debug][Elements] mounting with options:", { mode, amount: renewalAmount, currency, hasPricing: !!pricing })

  return (
    <ViewReveal
      className="rounded-[26px] bg-[var(--p-surface)] p-5"
      y={12}
      style={{ border: "1px solid rgba(25,23,21,0.07)", boxShadow: "0 22px 60px rgba(40,30,25,0.09)" }}
    >
      <Elements
        stripe={stripePromise}
        options={{
          mode: mode === "setup" ? "setup" : "payment",
          amount: mode === "setup" ? undefined : renewalAmount,
          currency,
        }}
      >
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
      await fetch("/api/payment/verify-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
        signal: controller.signal,
      })
    } catch (err) {
      console.error("[checkout][debug] Failed to verify subscription after checkout:", err)
    } finally {
      clearTimeout(timer)
    }
    router.push("/success")
  }

  return (
    <div className="min-h-dvh text-[var(--p-ink)]" style={{ ...palette, background: "var(--p-bg)" }}>
      <CheckoutExitGuard active={!paymentDone} />

      <CheckoutHeader />

      <main className="mx-auto max-w-[480px] px-4 py-4 sm:px-5 sm:py-8">
        <div className="flex flex-col">
          <div className="flex flex-col gap-4">
            <CheckoutIntro isTrial={checkoutData ? checkoutData.mode === "setup" : null} />

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
