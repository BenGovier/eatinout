import type { Metadata } from "next"
import { PrestonHeader } from "@/components/prestonblog/preston-header"
import { PrestonHero } from "@/components/prestonblog/preston-hero"
import { PrestonValueStrip } from "@/components/prestonblog/preston-value-strip"
import { PrestonWhyJoin } from "@/components/prestonblog/preston-why-join"
import { PrestonOffers } from "@/components/prestonblog/preston-offers"
import { PrestonHowItWorks } from "@/components/prestonblog/preston-how-it-works"
import { PrestonSavings } from "@/components/prestonblog/preston-savings"
import { PrestonCoverage } from "@/components/prestonblog/preston-coverage"
import { PrestonTestimonials } from "@/components/prestonblog/preston-testimonials"
import { PrestonMsBonus } from "@/components/prestonblog/preston-ms-bonus"
import { PrestonFaq } from "@/components/prestonblog/preston-faq"
import { PrestonFinalCta } from "@/components/prestonblog/preston-final-cta"
import { PrestonFooter } from "@/components/prestonblog/preston-footer"
import { PrestonStickyCta } from "@/components/prestonblog/preston-sticky-cta"

export const metadata: Metadata = {
  title: "Eat Out More, Spend Less | EatinOut Free 30-Day Trial",
  description:
    "Save up to 50% at hundreds of restaurants across Lancashire. Use EatinOut as often as you like. Try free for 30 days, then only £4.99/month. Cancel anytime.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Eat out more often. Spend less every time. | EatinOut",
    description:
      "Save up to 50% at hundreds of restaurants across Lancashire. Free 30-day trial, then £4.99/month. Cancel anytime.",
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
      <PrestonWhyJoin />
      <PrestonOffers />
      <PrestonHowItWorks />
      <PrestonSavings />
      <PrestonCoverage />
      <PrestonTestimonials />
      <PrestonMsBonus />
      <PrestonFaq />
      <PrestonFinalCta />
      <PrestonFooter />
      <PrestonStickyCta />
    </main>
  )
}
