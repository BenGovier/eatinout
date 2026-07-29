import type { Metadata } from "next"
import { PrestonHeader } from "@/components/prestonblog/preston-header"
import { PrestonHero } from "@/components/prestonblog/preston-hero"
import { PrestonValueStrip } from "@/components/prestonblog/preston-value-strip"
import { PrestonHowItWorks } from "@/components/prestonblog/preston-how-it-works"
import { PrestonOffers } from "@/components/prestonblog/preston-offers"
import { PrestonSavings } from "@/components/prestonblog/preston-savings"
import { PrestonMsBonus } from "@/components/prestonblog/preston-ms-bonus"
import { PrestonFaq } from "@/components/prestonblog/preston-faq"
import { PrestonFinalCta } from "@/components/prestonblog/preston-final-cta"
import { PrestonFooter } from "@/components/prestonblog/preston-footer"
import { PrestonStickyCta } from "@/components/prestonblog/preston-sticky-cta"

export const metadata: Metadata = {
  title: "Save up to 50% at Restaurants Near You | EatinOut Free 30-Day Trial",
  description:
    "450+ restaurant offers across Lancashire. Use EatinOut as often as you like. Try free for 30 days, then only £4.99/month — plus a £50 M&S gift card when you sign up today. Cancel anytime.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Save up to 50% at Restaurants Near You | EatinOut",
    description:
      "450+ offers across Lancashire. Free 30-day trial, then £4.99/month. Plus a £50 M&S gift card when you sign up today. Cancel anytime.",
    type: "website",
    images: [{ url: "/images/prestonblog/hero-people.png" }],
  },
}

export default function EatinOutLandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <PrestonHeader />
      <PrestonHero />
      <PrestonValueStrip />
      <PrestonHowItWorks />
      <PrestonOffers />
      <PrestonSavings />
      <PrestonMsBonus />
      <PrestonFaq />
      <PrestonFinalCta />
      <PrestonFooter />
      <PrestonStickyCta />
    </main>
  )
}
