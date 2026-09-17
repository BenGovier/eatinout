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
  "--p-bg": "#F7F5F2", // warm stone page background
  "--p-surface": "#FFFFFF", // main white surface
  "--p-cream": "#FFF8F3", // warm cream — value areas
  "--p-blush": "#FDECEF", // soft blush — free-trial / value accents
  "--p-ink": "#16171A", // deep warm ink — major headings
  "--p-muted": "#6F7178", // muted copy
  "--p-muted-strong": "#555861", // field labels
  "--p-gold": "#C59445", // champagne / warm gold — stars & tiny accents only
  "--p-sage": "#EDF3EE", // soft sage — positive / reassurance
  "--p-red": "#D90429", // EatinOut brand red (unchanged)
  "--p-red-hover": "#BE0324",
  "--p-border": "rgba(22,23,26,0.08)",
  "--p-field": "#FAFAF9",
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
        <p className="text-[29px] font-extrabold leading-[1.02] tracking-tight text-white drop-shadow-sm sm:text-[32px]">
          Eat out more.
          <br />
          Pay less.
        </p>
        <p className="mt-2 text-sm font-medium text-white/90 sm:text-[15px]">
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
          <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--p-red)]">
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
        className="max-w-[360px] text-pretty font-extrabold tracking-tight text-[var(--p-ink)]"
        style={{ fontSize: "clamp(30px, 7vw, 34px)", lineHeight: 1.1 }}
      >
        Your next meal could pay for your membership.
      </h1>
      <p className="mt-3 max-w-md text-[17px] leading-relaxed text-[var(--p-muted)]">
        Try EatinOut free for 30 days and start saving at 500+ restaurants, cafés and bars.
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
        <span className="text-lg font-extrabold leading-none text-[var(--p-ink)]">4.8</span>
        <span className="text-[11px] font-medium text-[var(--p-muted)]">Members</span>
      </div>

      {/* places */}
      <div className="flex flex-col items-center justify-center gap-1 px-2 py-4 text-center" style={{ borderInline: "1px solid rgba(22,23,26,0.08)" }}>
        <span className="text-xl font-extrabold leading-none text-[var(--p-ink)]">500+</span>
        <span className="text-[11px] font-medium text-[var(--p-muted)]">Places to save</span>
      </div>

      {/* cancel */}
      <div className="flex flex-col items-center gap-1 px-2 py-4 text-center">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{ background: "var(--p-sage)" }}
          aria-hidden="true"
        >
          <Check className="h-3.5 w-3.5 text-[var(--p-red)]" />
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
      {/* barely-there radial glow, behind the panel only, for depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3"
        style={{ background: "radial-gradient(circle at 85% 20%, rgba(217,4,41,0.055), transparent 38%)" }}
      />

      <ViewReveal
        className="relative rounded-[24px] p-6"
        y={12}
        style={{
          backgroundImage: "linear-gradient(135deg, #FFF8F3 0%, #FFFFFF 55%, #FDECEF 100%)",
          border: "1px solid rgba(217,4,41,0.08)",
          boxShadow: "0 16px 48px rgba(22,23,26,0.07)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--p-red)]">Why it&apos;s worth it</p>

        {/* headline value row */}
        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-extrabold leading-[0.9] tracking-tight text-[var(--p-ink)]" style={{ fontSize: "clamp(52px, 15vw, 58px)" }}>
              £0
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--p-ink)]">Today</p>
            <p className="mt-1.5 text-sm font-medium text-[var(--p-muted)]">30 days completely free</p>
          </div>

          <div
            className="flex h-[104px] w-[104px] shrink-0 flex-col items-center justify-center rounded-full text-center"
            style={{ background: "var(--p-blush)" }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--p-red)]">Up to</span>
            <span className="text-3xl font-extrabold leading-none text-[var(--p-red)]">50%</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--p-red)]">Off</span>
          </div>
        </div>

        <div className="my-6 h-px" style={{ background: "rgba(22,23,26,0.08)" }} />

        {/* saving example — visual grouping, not a table */}
        <p className="text-[15px] font-semibold text-[var(--p-ink)]">
          One dinner can make the membership feel tiny.
        </p>

        <StaggerGroup className="mt-4 flex items-center gap-3" stagger={0.09}>
          <StaggerItem className="flex-1 rounded-xl bg-white/70 px-3 py-3 text-center" style={{ border: "1px solid rgba(22,23,26,0.06)" }}>
            <span className="block text-[11px] font-medium text-[var(--p-muted)]">£50 dinner</span>
            <span className="mt-1 block text-lg font-bold text-[var(--p-ink)]">£50</span>
          </StaggerItem>

          <ArrowRight className="h-5 w-5 shrink-0 text-[var(--p-muted)]" aria-hidden="true" />

          <StaggerItem className="flex-1 rounded-xl px-3 py-3 text-center" style={{ background: "var(--p-blush)", border: "1px solid rgba(217,4,41,0.10)" }}>
            <span className="block text-[11px] font-medium text-[var(--p-red)]">Up to saved*</span>
            <span className="mt-1 block text-2xl font-extrabold leading-none text-[var(--p-red)]">£25</span>
          </StaggerItem>
        </StaggerGroup>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-sm text-[var(--p-muted)]">Membership after trial</span>
          <span className="text-lg font-bold text-[var(--p-ink)]">£4.99/month</span>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-[var(--p-muted)]">
          *Illustrative example using a participating 50% offer.
        </p>

        <p className="mt-3 text-[13px] font-medium text-[var(--p-ink)]">
          One good saving can cover several months of membership.
        </p>
      </ViewReveal>
    </div>
  )
}

/* ── SOCIAL PROOF — compact quote, no big card ──────────────────────────── */
function SocialProof() {
  return (
    <ViewReveal className="flex items-center gap-4" y={8}>
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm">
        <Image
          src="/testimonial-emma-davies.webp"
          alt="EatinOut member"
          fill
          sizes="56px"
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
          <span className="text-[13px] font-medium text-[var(--p-muted)]">Rated 4.8 by EatinOut members</span>
        </span>
        <p className="mt-1 text-[15px] font-medium text-[var(--p-ink)]">&ldquo;Saved £27 on our first meal.&rdquo;</p>
      </div>
    </ViewReveal>
  )
}

/* ── TRANSITION into checkout ───────────────────────────────────────────── */
function CheckoutTransition() {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold tracking-tight text-[var(--p-ink)]">Ready to start saving?</h2>
      <p className="mt-1 text-sm text-[var(--p-muted)]">Join in seconds. £0 charged today.</p>
    </div>
  )
}

/* ── CHECKOUT CARD ──────────────────────────────────────────────────────── */
function CheckoutCard() {
  return (
    <ViewReveal
      className="rounded-[26px] bg-[var(--p-surface)] p-5"
      y={12}
      style={{ border: "1px solid rgba(22,23,26,0.07)", boxShadow: "0 20px 60px rgba(22,23,26,0.09)" }}
    >
      {/* final financial confirmation */}
      <div
        className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5"
        style={{ background: "var(--p-cream)", border: "1px solid rgba(22,23,26,0.06)" }}
      >
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--p-muted)]">Today</p>
          <p className="text-xl font-extrabold leading-tight text-[var(--p-ink)]">£0</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--p-muted)]" aria-hidden="true" />
        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--p-muted)]">After 30 days</p>
          <p className="text-xl font-extrabold leading-tight text-[var(--p-ink)]">£4.99<span className="text-sm font-semibold text-[var(--p-muted)]">/mo</span></p>
        </div>
      </div>

      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[13px] font-medium text-[var(--p-muted)]">
        <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: "var(--p-sage)" }} aria-hidden="true">
          <Check className="h-2.5 w-2.5 text-[var(--p-red)]" />
        </span>
        Cancel anytime
      </p>

      {/* express */}
      <div className="mt-6">
        <h3 className="text-[15px] font-bold text-[var(--p-ink)]">Fastest way to join</h3>
        <p className="mt-0.5 text-[13px] text-[var(--p-muted)]">No charge today.</p>
        <div className="mt-3">
          <StripeExpressCheckoutPlaceholder />
        </div>
      </div>

      {/* divider */}
      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1" style={{ background: "rgba(22,23,26,0.10)" }} />
        <span className="text-xs font-medium text-[var(--p-muted)]">or pay with card</span>
        <span className="h-px flex-1" style={{ background: "rgba(22,23,26,0.10)" }} />
      </div>

      {/* card fields */}
      <StripePaymentElementPlaceholder />

      {/* CTA */}
      <div className="mt-5">
        <CheckoutCTA />
      </div>

      {/* trust footer */}
      <div className="mt-5 border-t pt-4 text-center" style={{ borderColor: "rgba(22,23,26,0.07)" }}>
        <p className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-[var(--p-muted)]">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Payments secured by Stripe
        </p>
        <p className="mt-1 text-[12px] text-[var(--p-muted)]/80">Bank verification may be required.</p>
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
