import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Gift, ArrowRight } from "lucide-react"
import { PrestonHeader } from "@/components/prestonblog/preston-header"
import { PrestonHero } from "@/components/prestonblog/preston-hero"
import { PrestonSavings } from "@/components/prestonblog/preston-savings"
import { PrestonOffers } from "@/components/prestonblog/preston-offers"
import { PrestonHowItWorks } from "@/components/prestonblog/preston-how-it-works"
import { PrestonTestimonials } from "@/components/prestonblog/preston-testimonials"
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

      {/* Full-width campaign ribbon — the entire strip is the CTA.
          Bridges the hero into the proof-of-value section below. */}
      <Link
        href="/sign-up"
        aria-label="Join today and receive a free £50 M&S gift card — start your free trial"
        className="group flex w-full items-center gap-4 bg-[var(--eo-red)] px-5 py-4 text-white transition-colors hover:bg-[#b8031f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--eo-red)]/40 sm:justify-center sm:gap-6"
      >
        {/* Premium product chip — straight, not tilted */}
        <span className="relative h-14 w-[86px] shrink-0 overflow-hidden rounded-md ring-1 ring-white/25 shadow-md">
          <Image
            src="/images/prestonblog/ms-giftcard-flat.png"
            alt="Marks & Spencer gift card"
            fill
            sizes="86px"
            className="scale-125 object-cover object-center"
          />
        </span>

        {/* Message */}
        <span className="min-w-0">
          <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
            Limited-time bonus
          </span>
          <span className="mt-0.5 block text-pretty text-[17px] font-bold leading-snug sm:text-lg">
            Join today &amp; get a FREE £50 M&amp;S Gift Card
          </span>
        </span>

        {/* Affordance */}
        <span className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5 sm:ml-0">
          <Gift className="h-4 w-4 text-white sm:hidden" />
          <ArrowRight className="hidden h-5 w-5 text-white sm:block" />
        </span>
      </Link>

      <PrestonSavings />
      <PrestonOffers />
      <PrestonHowItWorks />
      <PrestonTestimonials />
      <PrestonFaq />
      <PrestonFinalCta />
      <PrestonFooter />
      <PrestonStickyCta />
    </main>
  )
}
