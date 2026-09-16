import Image from "next/image"
import { Lock, Check, ShieldCheck } from "lucide-react"
import { StripeExpressCheckoutPlaceholder } from "./stripe-express-checkout-placeholder"
import { StripePaymentElementPlaceholder } from "./stripe-payment-element-placeholder"
import { CheckoutCTA } from "./checkout-cta"

/* ---- small local pieces (kept inline to avoid over-componentising) ---- */

function CheckoutHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-3.5">
        <Image
          src="/images/eatinoutlogo.webp"
          alt="EatinOut"
          width={640}
          height={150}
          priority
          className="h-6 w-auto sm:h-7"
        />
        <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--eo-muted)]">
          <Lock className="h-4 w-4" aria-hidden="true" />
          Secure checkout
        </div>
      </div>
    </header>
  )
}

const REASSURANCE = ["Cancel anytime", "Secure checkout", "Local dining offers"]

function CheckoutLifestylePanel() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl">
        <Image
          src="/images/prestonblog/moment-datenight.png"
          alt="Friends and couples enjoying an evening out at a local restaurant"
          width={1024}
          height={1024}
          priority
          className="h-40 w-full object-cover sm:h-52 lg:h-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <p className="absolute bottom-3 left-4 text-sm font-semibold text-white drop-shadow-sm sm:bottom-4 sm:left-5 sm:text-base">
          Great food. Better value.
        </p>
      </div>

      {/* Desktop-only value proposition + reassurance list */}
      <div className="hidden lg:block">
        <h2 className="text-xl font-bold text-[var(--eo-ink)]">Dine out for less, all year round</h2>
        <p className="mt-2 text-pretty text-[var(--eo-muted)]">
          Unlock 2-for-1 mains and up to 50% off at hundreds of local restaurants, cafés and bars near you.
        </p>
        <ul className="mt-5 space-y-3">
          {REASSURANCE.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm font-medium text-[var(--eo-ink)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--eo-red)]/10">
                <Check className="h-3.5 w-3.5 text-[var(--eo-red)]" aria-hidden="true" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function CheckoutIntro() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-3xl">
        Start your 30-day free trial
      </h1>
      <p className="mt-2 text-pretty text-[var(--eo-muted)]">Save up to 50% at local restaurants near you.</p>

      {/* Mobile reassurance chips (desktop uses the left-panel list) */}
      <ul className="mt-4 flex flex-wrap gap-2 lg:hidden">
        {REASSURANCE.map((item) => (
          <li
            key={item}
            className="flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-3 py-1 text-xs font-medium text-[var(--eo-ink)]"
          >
            <Check className="h-3 w-3 text-[var(--eo-red)]" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

const PROOF_THUMBS = [
  { src: "/images/prestonblog/moment-italian.png", alt: "Italian restaurant dish" },
  { src: "/images/prestonblog/moment-cocktails.png", alt: "Cocktails at a bar" },
  { src: "/images/prestonblog/moment-brunch.png", alt: "Brunch plate" },
  { src: "/images/prestonblog/moment-grill.png", alt: "Grill restaurant meal" },
]

function SocialProof() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {PROOF_THUMBS.map((thumb) => (
          <span
            key={thumb.src}
            className="relative h-8 w-8 overflow-hidden rounded-full ring-2 ring-white"
          >
            <Image src={thumb.src} alt={thumb.alt} fill sizes="32px" className="object-cover" />
          </span>
        ))}
      </div>
      <p className="text-sm font-medium text-[var(--eo-muted)]">500+ restaurants, cafés and bars</p>
    </div>
  )
}

function MembershipSummary() {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-bold text-[var(--eo-ink)]">£0 today</p>
          <p className="mt-1 text-sm text-[var(--eo-muted)]">
            Then £4.99/month after your 30-day free trial
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--eo-red)]/10 px-3 py-1 text-xs font-semibold text-[var(--eo-red)]">
          Save up to 50%
        </span>
      </div>
    </div>
  )
}

function CheckoutSecurity() {
  return (
    <div className="space-y-1 text-center">
      <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-[var(--eo-muted)]">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        Secure payments powered by Stripe
      </p>
      <p className="text-xs text-[var(--eo-muted)]/80">
        You may be asked to verify with your bank if required.
      </p>
    </div>
  )
}

/* ---- assembled prototype ---- */

export function EatinOutCheckoutPrototype() {
  return (
    <div className="min-h-dvh bg-[var(--eo-bg)] text-[var(--eo-ink)]">
      <CheckoutHeader />

      <main className="mx-auto max-w-[1120px] px-5 py-6 sm:py-8">
        <div className="lg:grid lg:grid-cols-[1fr_minmax(440px,500px)] lg:items-start lg:gap-12">
          {/* LEFT: lifestyle imagery + value prop (desktop) / compact image (mobile) */}
          <div className="lg:pt-2">
            <CheckoutLifestylePanel />
          </div>

          {/* RIGHT: the checkout card */}
          <div className="mt-6 rounded-2xl border border-black/5 bg-[var(--eo-card)] p-5 shadow-sm sm:p-6 lg:mt-0">
            <div className="space-y-6">
              <CheckoutIntro />
              <SocialProof />
              <MembershipSummary />

              <StripeExpressCheckoutPlaceholder />

              {/* PAYMENT DIVIDER */}
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-black/10" />
                <span className="text-xs font-medium text-[var(--eo-muted)]">or pay with card</span>
                <span className="h-px flex-1 bg-black/10" />
              </div>

              <StripePaymentElementPlaceholder />

              <CheckoutCTA />
              <CheckoutSecurity />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/**
 * ============================================================================
 * DEVELOPER HANDOFF
 * ============================================================================
 *
 * Intended production Stripe architecture
 * ----------------------------------------
 *   EatinOut checkout UI
 *           ↓
 *   Stripe Express Checkout Element
 *   and/or
 *   Stripe Payment Element
 *           ↓
 *   existing server-side EatinOut subscription architecture
 *           ↓
 *   Stripe
 *
 * ----------------------------------------------------------------------------
 * PROTOTYPE ONLY.
 *
 * No existing checkout, subscription, authentication, webhook or payment
 * functionality has been modified.
 *
 * Developers must review the existing Stripe implementation before connecting
 * this interface to production.
 * ----------------------------------------------------------------------------
 */
