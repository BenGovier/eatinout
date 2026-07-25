import type { Metadata } from "next"
import { PrestonHeader } from "@/components/prestonblog/preston-header"
import { PrestonHero } from "@/components/prestonblog/preston-hero"
import { PrestonOffers } from "@/components/prestonblog/preston-offers"
import { PrestonSavings } from "@/components/prestonblog/preston-savings"
import { PrestonHowItWorks } from "@/components/prestonblog/preston-how-it-works"
import { PrestonTestimonials } from "@/components/prestonblog/preston-testimonials"
import { PrestonStats } from "@/components/prestonblog/preston-stats"
import { PrestonFinalCta } from "@/components/prestonblog/preston-final-cta"
import { PrestonFooter } from "@/components/prestonblog/preston-footer"
import { PrestonStickyCta } from "@/components/prestonblog/preston-sticky-cta"

export const metadata: Metadata = {
  title: "Save up to 50% at Preston Restaurants | EatinOut Free Trial",
  description:
    "Exclusive for BlogPreston readers. Start your FREE 30-day EatinOut trial and unlock discounts at local Preston restaurants, cafés and bars. No charge today, cancel anytime.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Save up to 50% at Preston Restaurants | EatinOut",
    description:
      "Start your FREE 30-day trial and save at local Preston restaurants, cafés and bars. No charge today. Cancel anytime.",
    type: "website",
    images: [{ url: "/images/prestonblog/hero-dining.png" }],
  },
}

export default function PrestonBlogLandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <PrestonHeader />
      <PrestonHero />
      <PrestonOffers />
      <PrestonSavings />
      <PrestonHowItWorks />
      <PrestonTestimonials />
      <PrestonStats />
      <PrestonFinalCta />
      <PrestonFooter />
      <PrestonStickyCta />
    </main>
  )
}
