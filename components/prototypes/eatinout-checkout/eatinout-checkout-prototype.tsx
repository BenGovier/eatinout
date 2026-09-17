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

const REASSURANCE = ["Up to 50% off", "500+ places", "Cancel anytime"]

function CheckoutLifestylePanel() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl">
        <Image
          src="/images/prestonblog/moment-grill.png"
          alt="Happy diners enjoying a freshly cooked steak dinner at a warm, characterful local restaurant"
          width={1024}
          height={1024}
          priority
          className="h-56 w-full object-cover object-center sm:h-64 lg:h-80"
        />
        {/* Warm legibility gradient — darker at the base so the hero copy reads cleanly */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />

        {/* Hero proposition — bottom-left, over the darkest part of the gradient */}
        <div className="absolute bottom-3 left-4 right-4 sm:bottom-4 sm:left-5">
          <p className="text-lg font-bold leading-tight text-white drop-shadow-sm sm:text-xl">
            Eat out more. Pay less.
          </p>
          <p className="mt-0.5 text-xs font-medium text-white/85 sm:text-sm">
            Save up to 50% at restaurants near you.
          </p>
        </div>

        {/* EatinOut savings overlay — compact product card, ~20-25% smaller than before */}
        <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
          <div className="flex items-center gap-2 rounded-lg border border-black/5 bg-white/95 p-1.5 pr-2.5 shadow-lg backdrop-blur">
            <span className="flex flex-col items-center justify-center rounded-md bg-[var(--eo-red)] px-2 py-1 leading-none text-white">
              <span className="text-sm font-extrabold sm:text-base">50%</span>
              <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider">Off</span>
            </span>
            <span>
              <span className="block text-[11px] font-bold leading-tight text-[var(--eo-ink)]">
                Potential £25 saving
              </span>
              <span className="block text-[10px] leading-tight text-[var(--eo-muted)]">on a £50 bill</span>
              <span className="mt-0.5 block text-[9px] leading-tight text-[var(--eo-muted)]/80">
                with a participating 50% offer
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Desktop-only value proposition + reassurance list */}
      <div className="hidden lg:block">
        <h2 className="text-xl font-bold text-[var(--eo-ink)]">Dine out for less, all year round</h2>
        <p className="mt-2 text-pretty text-[var(--eo-muted)]">
          Unlock 2-for-1 mains and exclusive member offers at hundreds of local restaurants, cafés and bars near you.
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
      <p className="mt-2 text-pretty text-[var(--eo-muted)]">
        Try EatinOut free and start saving at 500+ restaurants, cafés and bars.
      </p>

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
      <div>
        <p className="text-sm font-semibold text-[var(--eo-ink)]">500+ restaurants, cafés and bars</p>
        <p className="text-xs font-medium text-[var(--eo-muted)]">Rated 4.8 by EatinOut members</p>
        <p className="text-xs text-[var(--eo-muted)]/80">&ldquo;Saved £27 on our first meal.&rdquo;</p>
      </div>
    </div>
  )
}

function MembershipSummary() {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-extrabold leading-none text-[var(--eo-ink)] sm:text-4xl">£0 today</p>
          <p className="mt-2 text-sm font-semibold text-[var(--eo-ink)]">30 days completely free</p>
          <p className="mt-1 text-sm text-[var(--eo-muted)]">Then £4.99/month</p>
          <p className="mt-0.5 text-sm text-[var(--eo-muted)]">Cancel anytime</p>
        </div>
        <div className="shrink-0 rounded-xl bg-[var(--eo-red)]/10 px-3 py-2 text-center">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--eo-red)]">
            Save up to
          </span>
          <span className="block text-xl font-extrabold leading-none text-[var(--eo-red)]">50%</span>
          <span className="mt-1 block text-[9px] leading-tight text-[var(--eo-red)]/70">on participating offers</span>
        </div>
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
