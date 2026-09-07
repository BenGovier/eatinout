import type { Metadata } from "next"
import { CampaignHeader } from "@/components/prestonblog/campaign/campaign-header"
import { CampaignHero } from "@/components/prestonblog/campaign/campaign-hero"
import { CampaignLocal } from "@/components/prestonblog/campaign/campaign-local"
import { CampaignValue } from "@/components/prestonblog/campaign/campaign-value"
import { CampaignOccasions } from "@/components/prestonblog/campaign/campaign-occasions"
import { CampaignHowItWorks } from "@/components/prestonblog/campaign/campaign-how-it-works"
import { CampaignTrust } from "@/components/prestonblog/campaign/campaign-trust"
import { CampaignFinalCta } from "@/components/prestonblog/campaign/campaign-final-cta"

export const metadata: Metadata = {
  title: "Save up to 50% at local restaurants | EatinOut",
  description:
    "Eat out more and spend less across Preston and Lancashire. Start your 30-day free trial with EatinOut — 450+ restaurant offers. No charge today, cancel anytime.",
  openGraph: {
    title: "Save up to 50% at local restaurants | EatinOut",
    description:
      "Eat out more and spend less across Preston and Lancashire. Start your 30-day free trial — no charge today, cancel anytime.",
    images: ["/images/prestonblog/campaign/hero-dinner.png"],
  },
}

/**
 * /prestonblog — isolated BlogPreston campaign landing page.
 * Single conversion goal: start a 30-day free trial via the existing
 * /sign-up route. Consumes existing functionality only; no auth, signup,
 * checkout, API, database or shared components are modified.
 */
export default function PrestonBlogCampaignPage() {
  return (
    <main className="bg-white text-[var(--eo-ink)]">
      <CampaignHeader />
      <CampaignHero />
      <CampaignLocal />
      <CampaignValue />
      <CampaignOccasions />
      <CampaignHowItWorks />
      <CampaignTrust />
      <CampaignFinalCta />
    </main>
  )
}
