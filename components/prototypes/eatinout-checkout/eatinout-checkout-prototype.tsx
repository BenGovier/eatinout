"use client"

import type { CSSProperties } from "react"
import Image from "next/image"
import { Lock, Check, ShieldCheck, Star, ArrowRight } from "lucide-react"
import { StripeExpressCheckoutPlaceholder } from "./stripe-express-checkout-placeholder"
import { StripePaymentElementPlaceholder } from "./stripe-payment-element-placeholder"
import { CheckoutCTA } from "./checkout-cta"
import { LoadReveal, ViewReveal, StaggerGroup, StaggerItem } from "./motion"

/**
 * Local, prototype-scoped hospitality palette.
 *
 * These are set as CSS custom properties on the prototype root and inherited by
 * every child component (CTA, express + payment placeholders). Nothing here
 * touches the global `--eo-*` design tokens or any other page.
 */
const palette = {
  "--p-bg": "#F7F3EF", // warm neutral page background
  "--p-surface": "#FFFFFF", // main white surface
  "--p-cream": "#FFF8F3", // warm cream — value / surface depth
  "--p-blush": "#FFF0F3", // soft blush — value accents
  "--p-blush-strong": "#FADDE3", // dark blush — 50% circle
  "--p-ink": "#191715", // warm ink — primary headings (never pure black)
  "--p-body": "#625D58", // body copy
  "--p-muted": "#817A74", // secondary / supporting copy
  "--p-gold": "#C28C32", // premium gold — ratings/stars ONLY
  "--p-sage": "#5F7A68", // sage — reassurance/cancellation text ONLY
  "--p-sage-bg": "#EEF4EF", // soft sage — reassurance surfaces
  "--p-red": "#D90429", // EatinOut brand red — commercial emphasis + CTA
  "--p-red-hover": "#B80324", // darker red — hover / strong emphasis only
  "--p-border": "rgba(25,23,21,0.08)",
  "--p-field": "#FCFBFA", // input surface
  "--p-arrow": "#A29A94", // equation arrows (never black)
  "--p-sep": "#BBB4AE", // inline separators
} as CSSProperties

/* ── HEADER ─────────────────────────────────────────────────────────────── */
function CheckoutHeader() {
  return (
    <header
      className="sticky top-0 z-20 backdrop-blur-sm"
      style={{ background: "rgba(255,255,255,0.92)", borderBottom: "1px solid rgba(22,23,26,0.06)" }}
    >
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5">
        <Image
          src="/images/eatinoutlogo.webp"
          alt="EatinOut"
          width={640}
          height={150}
          priority
          className="h-[26px] w-auto"
        />
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--p-muted)]">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          Secure checkout
        </div>
      </div>
    </header>
  )
}

/* ── HERO — make it feel expensive ──────────────────────────────────────── */
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
        style={{
          backgroundImage:
            "linear-gradient(to top, rgba(10,10,10,0.70) 0%, rgba(10,10,10,0.10) 45%, rgba(10,10,10,0) 75%)",
        }}
      />

      {/* Proposition — bottom-left */}
      <LoadReveal className="absolute bottom-4 left-5 right-5 sm:bottom-5 sm:left-6" y={10} delay={0.12}>
        <p
          className="text-white drop-shadow-sm"
          style={{ fontSize: "clamp(31px, 8.5vw, 40px)", fontWeight: 800, lineHeight: 0.98, letterSpacing: "-0.035em" }}
        >
          Eat out more.
          <br />
          <span className="relative inline-block" style={{ fontWeight: 850 }}>
            Pay less.
            <span
              aria-hidden="true"
              className="absolute -bottom-[5px] left-0 h-[3px] w-full rounded-full"
              style={{ background: "var(--p-red)" }}
            />
          </span>
        </p>
        <p className="mt-2.5 text-sm sm:text-[15px]" style={{ fontWeight: 600, color: "rgba(255,255,255,0.90)" }}>
          Save up to 50% at restaurants near you.
        </p>
      </LoadReveal>

      {/* Single discount badge — top-right */}
      <LoadReveal className="absolute right-4 top-4" y={8} delay={0.26}>
        <div
          className="rounded-xl px-3 py-2 text-center backdrop-blur-md"
          style={{
            background: "rgba(255,255,255,0.94)",
            border: "1px solid rgba(255,255,255,0.5)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          <span
            className="block text-[9px] uppercase text-[var(--p-red)]"
            style={{ fontWeight: 800, letterSpacing: "0.12em" }}
          >
            EatinOut offer
          </span>
          <span className="mt-0.5 block text-[15px] font-extrabold leading-none text-[var(--p-ink)]">
            Up to 50% off
          </span>
        </div>
      </LoadReveal>
    </LoadReveal>
  )
}

/* ── INTRO — no card ────────────────────────────────────────────────────── */
function Intro() {
  return (
    <ViewReveal className="pt-1">
      <h1
        className="max-w-[380px] text-pretty font-extrabold"
        style={{ fontSize: "clamp(30px, 7.2vw, 35px)", lineHeight: 1.03, letterSpacing: "-0.035em" }}
      >
        <span className="text-[var(--p-ink)]">Your next meal could </span>
        <span className="text-[var(--p-red)]">pay for your membership.</span>
      </h1>
      <p className="mt-3.5 max-w-md text-[17px] text-[var(--p-body)]" style={{ lineHeight: 1.48 }}>
        Try EatinOut free for{" "}
        <span className="font-bold text-[var(--p-ink)]">30 days</span> and start saving at{" "}
        <span className="font-bold text-[var(--p-ink)]">500+ restaurants, cafés and bars</span>.
      </p>
    </ViewReveal>
  )
}

/* ── PROOF STRIP ────────────────────────────────────────────────────────── */
function ProofStrip() {
  return (
    <ViewReveal
      className="grid grid-cols-3 rounded-2xl bg-[var(--p-surface)]"
      style={{ border: "1px solid rgba(22,23,26,0.07)" }}
      y={8}
    >
      {/* rating */}
      <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
        <span className="flex" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-[var(--p-gold)] text-[var(--p-gold)]" />
          ))}
        </span>
        <span className="text-[21px] font-extrabold leading-none text-[var(--p-ink)]">4.8</span>
        <span className="text-[11px] font-medium text-[var(--p-muted)]">Members</span>
      </div>

      {/* places */}
      <div className="flex flex-col items-center justify-center gap-1 px-2 py-4 text-center" style={{ borderInline: "1px solid var(--p-border)" }}>
        <span className="text-[21px] font-extrabold leading-none text-[var(--p-red)]">500+</span>
        <span className="text-[11px] font-medium text-[var(--p-muted)]">Places to save</span>
      </div>

      {/* cancel */}
      <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{ background: "var(--p-sage-bg)" }}
          aria-hidden="true"
        >
          <Check className="h-3.5 w-3.5 text-[var(--p-sage)]" />
        </span>
        <span className="text-lg font-extrabold leading-none text-[var(--p-ink)]">Anytime</span>
        <span className="text-[11px] font-medium text-[var(--p-muted)]">Cancel</span>
      </div>
    </ViewReveal>
  )
}

/* ── VALUE PANEL — the major design moment ──────────────────────────────── */
function ValuePanel() {
  return (
    <div className="relative">
      {/* barely-there ambient washes, behind the panel only, for depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4"
        style={{
          backgroundImage:
            "radial-gradient(circle at 85% 25%, rgba(217,4,41,0.045), transparent 35%), radial-gradient(circle at 0% 60%, rgba(194,140,50,0.035), transparent 32%)",
        }}
      />

      <ViewReveal
        className="relative rounded-[24px] p-6"
        y={12}
        style={{
          backgroundImage: "linear-gradient(135deg, #FFF8F3 0%, #FFFFFF 52%, #FFF0F3 100%)",
          border: "1px solid rgba(217,4,41,0.08)",
          boxShadow: "0 18px 50px rgba(40,30,25,0.07)",
        }}
      >
        <p className="text-[11px] uppercase text-[var(--p-red)]" style={{ fontWeight: 800, letterSpacing: "0.14em" }}>
          Why it&apos;s worth it
        </p>

        {/* headline value row */}
        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <p className="leading-[0.9] text-[var(--p-ink)]" style={{ fontSize: "clamp(52px, 15vw, 56px)", fontWeight: 850, letterSpacing: "-0.045em" }}>
              £0
            </p>
            <p className="mt-1.5 text-[11px] uppercase text-[var(--p-red)]" style={{ fontWeight: 800, letterSpacing: "0.1em" }}>
              Today
            </p>
            <p className="mt-2 text-sm font-bold text-[var(--p-ink)]">30 days completely free</p>
          </div>

          <div
            className="flex h-[108px] w-[108px] shrink-0 flex-col items-center justify-center rounded-full text-center"
            style={{ background: "var(--p-blush-strong)" }}
          >
            <span className="text-[10px] uppercase text-[var(--p-red)]" style={{ fontWeight: 800, letterSpacing: "0.06em" }}>
              Up to
            </span>
            <span className="text-[34px] leading-none text-[var(--p-red)]" style={{ fontWeight: 850, letterSpacing: "-0.02em" }}>
              50%
            </span>
            <span className="text-[10px] uppercase text-[var(--p-red)]" style={{ fontWeight: 800, letterSpacing: "0.06em" }}>
              Off
            </span>
          </div>
        </div>

        <div className="my-6 h-px" style={{ background: "var(--p-border)" }} />

        {/* saving example — visual grouping, not a table */}
        <p className="text-[15px] font-semibold text-[var(--p-ink)]">
          One dinner can make the membership feel tiny.
        </p>

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

        {/* editorial takeaway — red accent line, no card */}
        <div className="mt-5 flex items-stretch gap-3">
          <span aria-hidden="true" className="w-[3px] shrink-0 rounded-full" style={{ background: "var(--p-red)" }} />
          <p className="text-[13px] text-[var(--p-ink)]" style={{ fontWeight: 650, lineHeight: 1.45 }}>
            One good saving can cover several months of membership.
          </p>
        </div>

        <p className="mt-4 text-[11px] text-[var(--p-muted)]" style={{ lineHeight: 1.4 }}>
          *Illustrative example using a participating 50% offer.
        </p>
      </ViewReveal>
    </div>
  )
}

/* ── SOCIAL PROOF — compact quote, no big card ──────────────────────────── */
function SocialProof() {
  return (
    <ViewReveal className="flex items-center gap-4" y={8}>
      <span
        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full shadow-sm"
        style={{ border: "3px solid #FFF8F3", boxShadow: "0 4px 14px rgba(40,30,25,0.10)" }}
      >
        <Image
          src="/testimonial-emma-davies.webp"
          alt="EatinOut member"
          fill
          sizes="48px"
          className="object-cover"
        />
      </span>
      <div>
        <span className="flex items-center gap-2">
          <span className="flex" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-[var(--p-gold)] text-[var(--p-gold)]" />
            ))}
          </span>
          <span className="text-[13px] text-[var(--p-body)]">
            Rated <span className="font-bold text-[var(--p-ink)]">4.8</span> by{" "}
            <span className="font-bold text-[var(--p-ink)]">EatinOut members</span>
          </span>
        </span>
        <p className="mt-1 text-[16px] font-bold text-[var(--p-ink)]">&ldquo;Saved £27 on our first meal.&rdquo;</p>
      </div>
    </ViewReveal>
  )
}

/* ── TRANSITION into checkout ───────────────────────────────────────────── */
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

/* ── CHECKOUT CARD ──────────────────────────────────────────────────────── */
function CheckoutCard() {
  return (
    <ViewReveal
      className="rounded-[26px] bg-[var(--p-surface)] p-5"
      y={12}
      style={{ border: "1px solid rgba(25,23,21,0.07)", boxShadow: "0 22px 60px rgba(40,30,25,0.09)" }}
    >
      {/* final financial confirmation */}
      <div
        className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5"
        style={{ backgroundImage: "linear-gradient(90deg, #FFF8F3 0%, #FFF0F3 100%)" }}
      >
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--p-muted)]">Today</p>
          <p className="text-[24px] leading-tight text-[var(--p-red)]" style={{ fontWeight: 850 }}>£0</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--p-arrow)]" aria-hidden="true" />
        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--p-muted)]">After 30 days</p>
          <p className="text-[22px] leading-tight text-[var(--p-ink)]" style={{ fontWeight: 850 }}>
            £4.99<span className="text-sm text-[var(--p-body)]" style={{ fontWeight: 600 }}>/mo</span>
          </p>
        </div>
      </div>

      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[13px] text-[var(--p-sage)]" style={{ fontWeight: 650 }}>
        <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: "var(--p-sage-bg)" }} aria-hidden="true">
          <Check className="h-2.5 w-2.5 text-[var(--p-sage)]" />
        </span>
        Cancel anytime
      </p>

      {/* express */}
      <div className="mt-6">
        <h3 className="text-[17px] font-extrabold text-[var(--p-ink)]">Fastest way to join</h3>
        <p className="mt-0.5 text-[13px] text-[var(--p-red)]" style={{ fontWeight: 650 }}>No charge today.</p>
        <div className="mt-3">
          <StripeExpressCheckoutPlaceholder />
        </div>
      </div>

      {/* divider */}
      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1" style={{ background: "var(--p-border)" }} />
        <span className="text-xs font-medium text-[var(--p-muted)]">or pay with card</span>
        <span className="h-px flex-1" style={{ background: "var(--p-border)" }} />
      </div>

      {/* card fields */}
      <StripePaymentElementPlaceholder />

      {/* CTA */}
      <div className="mt-5">
        <CheckoutCTA />
      </div>

      {/* trust footer */}
      <div className="mt-5 border-t pt-4 text-center" style={{ borderColor: "var(--p-border)" }}>
        <p className="flex items-center justify-center gap-1.5 text-[13px] text-[var(--p-body)]">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--p-muted)]" aria-hidden="true" />
          Payments secured by <span className="font-bold text-[var(--p-ink)]">Stripe</span>
        </p>
        <p className="mt-1 text-[12px] text-[var(--p-muted)]">Bank verification may be required.</p>
      </div>
    </ViewReveal>
  )
}

/* ── ASSEMBLED PROTOTYPE ────────────────────────────────────────────────── */
export function EatinOutCheckoutPrototype() {
  return (
    <div className="min-h-dvh text-[var(--p-ink)]" style={{ ...palette, background: "var(--p-bg)" }}>
      <CheckoutHeader />

      <main className="mx-auto max-w-[1180px] px-5 py-7 sm:py-9">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          {/* LEFT — desire, value, proof (editorial rhythm) */}
          <div className="flex flex-col gap-8 lg:w-[56%]">
            <Hero />
            <Intro />
            <ProofStrip />
            <ValuePanel />
            <SocialProof />
          </div>

          {/* RIGHT — transition + focused checkout surface */}
          <div className="flex flex-col gap-5 lg:w-[40%] lg:shrink-0 lg:sticky lg:top-[88px]">
            <CheckoutTransition />
            <CheckoutCard />
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
 *   Stripe Express Checkout Element  (Apple Pay / Google Pay)
 *   and/or
 *   Stripe Payment Element            (card fields)
 *           ↓
 *   existing server-side EatinOut subscription architecture
 *           ↓
 *   Stripe
 *
 * ----------------------------------------------------------------------------
 * PROTOTYPE ONLY.
 *
 * No existing checkout, subscription, authentication, webhook, database or
 * payment functionality has been modified. The CTA is inert, the wallet
 * buttons and card fields are non-interactive visual mocks, and no Stripe
 * keys, sessions or API calls exist here.
 *
 * The colour palette above is scoped locally to this prototype via CSS custom
 * properties and does not affect the global `--eo-*` design tokens.
 * ----------------------------------------------------------------------------
 */
