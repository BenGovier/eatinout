import type { Metadata } from "next"
import type { CSSProperties } from "react"
import Link from "next/link"

import { CoastalHeader } from "@/components/coastalradio/coastal-header"
import { CoastalHero } from "@/components/coastalradio/coastal-hero"
import { CoastalTrustStrip } from "@/components/coastalradio/coastal-trust-strip"
import { CoastalOccasions } from "@/components/coastalradio/coastal-occasions"
import { CoastalValue } from "@/components/coastalradio/coastal-value"
import { CoastalSounds } from "@/components/coastalradio/coastal-sounds"
import { CoastalHowItWorks } from "@/components/coastalradio/coastal-how-it-works"
import { CoastalSocialProof } from "@/components/coastalradio/coastal-social-proof"
import { CoastalFinalCta } from "@/components/coastalradio/coastal-final-cta"
import { CoastalWordmark } from "@/components/coastalradio/coastal-wordmark"

export const metadata: Metadata = {
  title: "Coastal Radio × EatinOut — Eat out for less on the Fylde Coast",
  description:
    "Coastal Radio has teamed up with EatinOut. Join free for 30 days and save up to 50% at participating local restaurants across Blackpool, the Fylde Coast and Lancashire.",
  robots: { index: false, follow: false },
}

/**
 * Isolated co-branded Coastal Radio × EatinOut listener promotion.
 * Coastal palette is scoped locally here so nothing global is touched.
 * Every CTA points to the existing /sign-up flow.
 */
const coastalTheme: CSSProperties = {
  // Coastal Radio campaign palette (placeholder values pending official brand assets)
  ["--cr-purple" as string]: "#5b1a78",
  ["--cr-deep" as string]: "#280a3a",
  ["--cr-magenta" as string]: "#d61f8c",
  ["--cr-pink" as string]: "#f9a8d4",
  ["--cr-pale" as string]: "#f7f2fb",
}

export default function CoastalRadioPage() {
  return (
    <main style={coastalTheme} className="bg-white text-[var(--eo-ink)]">
      <CoastalHeader />
      <CoastalHero />
      <CoastalTrustStrip />
      <CoastalOccasions />
      <CoastalValue />
      <CoastalSounds />
      <CoastalHowItWorks />
      <CoastalSocialProof />
      <CoastalFinalCta />

      <footer className="bg-[var(--cr-deep)] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 text-center sm:px-6">
          <CoastalWordmark className="text-[22px] [--cr-purple:#ffffff] [--cr-magenta:#f9a8d4]" />
          <p className="text-xs text-white/60">
            EatinOut partner campaign for Coastal Radio listeners. Participating offers and savings vary by venue.
          </p>
          <div className="flex items-center gap-5 text-xs text-white/70">
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
