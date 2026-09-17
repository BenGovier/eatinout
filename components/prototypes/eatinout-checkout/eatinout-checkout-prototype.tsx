"use client"

import Image from "next/image"
import { Lock, Check, ShieldCheck, Star } from "lucide-react"
import { StripeExpressCheckoutPlaceholder } from "./stripe-express-checkout-placeholder"
import { StripePaymentElementPlaceholder } from "./stripe-payment-element-placeholder"
import { CheckoutCTA } from "./checkout-cta"
import { LoadReveal, ViewReveal, StaggerGroup, StaggerItem } from "./motion"

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

const CHIPS = ["Up to 50% off", "500+ places", "Cancel anytime"]

/* HERO — create desire ---------------------------------------------------- */
function Hero() {
  return (
    <LoadReveal className="relative overflow-hidden rounded-2xl" y={0} scale={1.02} duration={0.7}>
      <Image
        src="/images/prestonblog/moment-grill.png"
        alt="Friends enjoying a freshly cooked dinner at a warm, characterful local restaurant"
        width={1024}
        height={1024}
        priority
        className="h-56 w-full object-cover object-center sm:h-64 lg:h-[22rem]"
      />
      {/* Warm legibility gradient — darker at the base so the hero copy reads cleanly */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />

      {/* Hero proposition — bottom-left, over the darkest part of the gradient */}
      <LoadReveal className="absolute bottom-3 left-4 right-4 sm:bottom-5 sm:left-6" y={10} delay={0.1}>
        <p className="text-xl font-bold leading-tight text-white drop-shadow-sm sm:text-2xl">Eat out more. Pay less.</p>
        <p className="mt-1 text-sm font-medium text-white/85 sm:text-base">Save up to 50% at restaurants near you.</p>
      </LoadReveal>

      {/* EatinOut savings overlay — compact product card, not a coupon sticker */}
      <LoadReveal className="absolute right-3 top-3 sm:right-4 sm:top-4" y={8} delay={0.24}>
        <div className="flex items-center gap-2 rounded-lg border border-black/5 bg-white/95 p-1.5 pr-2.5 shadow-lg backdrop-blur">
          <span className="flex flex-col items-center justify-center rounded-md bg-[var(--eo-red)] px-2 py-1 leading-none text-white">
            <span className="text-sm font-extrabold sm:text-base">50%</span>
            <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider">Off</span>
          </span>
          <span>
            <span className="block text-[11px] font-bold leading-tight text-[var(--eo-ink)]">Potential £25 saving</span>
            <span className="block text-[10px] leading-tight text-[var(--eo-muted)]">on a £50 bill</span>
            <span className="mt-0.5 block text-[9px] leading-tight text-[var(--eo-muted)]/80">
              with a participating 50% offer
            </span>
          </span>
        </div>
      </LoadReveal>
    </LoadReveal>
  )
}

/* VALUE PROPOSITION — why EatinOut matters -------------------------------- */
function ValueProposition() {
  return (
    <ViewReveal>
      <h1 className="text-pretty text-2xl font-extrabold leading-[1.15] tracking-tight text-[var(--eo-ink)] sm:text-3xl lg:text-4xl">
        Your next meal could pay for your membership.
      </h1>
      <p className="mt-3 max-w-md text-pretty text-[15px] leading-relaxed text-[var(--eo-muted)] sm:text-base">
        Try EatinOut free for 30 days and start saving at 500+ restaurants, cafés and bars.
      </p>

      <StaggerGroup className="mt-5 flex flex-wrap gap-2" stagger={0.07}>
        {CHIPS.map((chip) => (
          <StaggerItem key={chip}>
            <span className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-sm font-medium text-[var(--eo-ink)] transition-all duration-150 motion-safe:hover:-translate-y-px motion-safe:hover:border-[var(--eo-red)]/40 motion-safe:hover:shadow-sm">
              <Check className="h-3.5 w-3.5 text-[var(--eo-red)]" aria-hidden="true" />
              {chip}
            </span>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </ViewReveal>
  )
}

/* VALUE MOMENT — why £4.99 is worth it ------------------------------------ */
function ValueMoment() {
  return (
    <ViewReveal className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--eo-red)]">
        One meal can cover your membership
      </p>

      <StaggerGroup className="mt-5 space-y-4" stagger={0.09}>
        <StaggerItem className="flex items-baseline justify-between gap-4 border-b border-black/5 pb-4">
          <span className="text-sm text-[var(--eo-muted)]">Restaurant bill</span>
          <span className="text-2xl font-bold text-[var(--eo-ink)]">£50</span>
        </StaggerItem>

        <StaggerItem className="flex items-baseline justify-between gap-4 border-b border-black/5 pb-4">
          <span className="text-sm text-[var(--eo-muted)]">
            Potential saving
            <span className="mt-0.5 block text-xs text-[var(--eo-muted)]/70">with a participating 50% offer</span>
          </span>
          <span className="text-2xl font-bold text-[var(--eo-red)]">&minus;£25</span>
        </StaggerItem>

        <StaggerItem className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-[var(--eo-muted)]">Monthly membership</span>
          <span className="text-2xl font-bold text-[var(--eo-ink)]">£4.99</span>
        </StaggerItem>
      </StaggerGroup>

      <ViewReveal delay={0.15}>
        <p className="mt-5 rounded-xl bg-[var(--eo-red)]/[0.06] px-4 py-3 text-sm font-semibold text-[var(--eo-ink)]">
          That&rsquo;s nearly 5 months of membership in one meal.
        </p>
        <p className="mt-2 text-xs text-[var(--eo-muted)]/70">
          Illustrative example. Offers vary by restaurant &mdash; not every meal saves 50%.
        </p>
      </ViewReveal>
    </ViewReveal>
  )
}

const PROOF_THUMBS = [
  { src: "/images/prestonblog/moment-italian.png", alt: "Italian restaurant dish" },
  { src: "/images/prestonblog/moment-cocktails.png", alt: "Cocktails at a bar" },
  { src: "/images/prestonblog/moment-brunch.png", alt: "Brunch plate" },
]

/* SOCIAL PROOF — proof that customers use it ------------------------------ */
function SocialProof() {
  return (
    <ViewReveal className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="flex" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-[var(--eo-gold,#e0a106)] text-[var(--eo-gold,#e0a106)]" />
            ))}
          </span>
          <span className="text-sm font-semibold text-[var(--eo-ink)]">Rated 4.8 by EatinOut members</span>
        </div>
        <p className="mt-1.5 text-sm text-[var(--eo-muted)]">&ldquo;Saved £27 on our first meal.&rdquo;</p>
        <p className="mt-1 text-xs font-medium text-[var(--eo-muted)]/80">500+ restaurants, cafés and bars</p>
      </div>

      <div className="flex -space-x-2.5">
        {PROOF_THUMBS.map((thumb) => (
          <span key={thumb.src} className="relative h-11 w-11 overflow-hidden rounded-xl ring-2 ring-white shadow-sm">
            <Image src={thumb.src} alt={thumb.alt} fill sizes="44px" className="object-cover" />
          </span>
        ))}
      </div>
    </ViewReveal>
  )
}

/* PRICING — remove financial anxiety -------------------------------------- */
function MembershipSummary() {
  return (
    <ViewReveal
      y={10}
      duration={0.45}
      className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-all duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-4xl font-extrabold leading-none tracking-tight text-[var(--eo-ink)]">£0 today</p>
          <p className="mt-2 text-sm font-semibold text-[var(--eo-ink)]">30 days completely free</p>
          <p className="mt-1 text-sm text-[var(--eo-muted)]">£4.99/month after your free trial</p>
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
    </ViewReveal>
  )
}

/* PAYMENT — make joining effortless --------------------------------------- */
function PaymentArea() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--eo-ink)]">Join in seconds</h2>
        <p className="mt-0.5 text-sm text-[var(--eo-muted)]">£0 charged today</p>
      </div>

      <StripeExpressCheckoutPlaceholder />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-black/10" />
        <span className="text-xs font-medium text-[var(--eo-muted)]">or use a card</span>
        <span className="h-px flex-1 bg-black/10" />
      </div>

      <StripePaymentElementPlaceholder />
    </div>
  )
}

/* TRUST ------------------------------------------------------------------- */
function CheckoutSecurity() {
  return (
    <div className="space-y-1 text-center">
      <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-[var(--eo-muted)]">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        Secure payments powered by Stripe
      </p>
      <p className="text-xs text-[var(--eo-muted)]/80">You may be asked to verify with your bank if required.</p>
    </div>
  )
}

/* ---- assembled prototype ---- */

export function EatinOutCheckoutPrototype() {
  return (
    <div className="min-h-dvh bg-[var(--eo-bg)] text-[var(--eo-ink)]">
      <CheckoutHeader />

      <main className="mx-auto max-w-[1120px] px-5 py-6 sm:py-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
          {/* LEFT: desire, value, proof — spacing/typography rhythm, not heavy cards */}
          <div className="space-y-8 lg:flex-1">
            <Hero />
            <ValueProposition />
            <ValueMoment />
            <SocialProof />
          </div>

          {/* RIGHT: the focused checkout column — action & confidence */}
          <div className="lg:w-[420px] lg:shrink-0">
            <div className="rounded-2xl border border-black/5 bg-[var(--eo-card)] p-5 shadow-sm sm:p-6 lg:sticky lg:top-[84px]">
              <div className="space-y-6">
                <MembershipSummary />
                <PaymentArea />
                <ViewReveal y={8}>
                  <CheckoutCTA />
                </ViewReveal>
                <CheckoutSecurity />
              </div>
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
