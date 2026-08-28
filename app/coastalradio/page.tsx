import type { Metadata } from "next"
import type { CSSProperties } from "react"
import Link from "next/link"

import { CoastalHeader } from "@/components/coastalradio/coastal-header"
import { CoastalHero } from "@/components/coastalradio/coastal-hero"
import { CoastalTrustStrip } from "@/components/coastalradio/coastal-trust-strip"
import { CoastalValue } from "@/components/coastalradio/coastal-value"
import { CoastalOccasions } from "@/components/coastalradio/coastal-occasions"
import { CoastalHowItWorks } from "@/components/coastalradio/coastal-how-it-works"
import { CoastalSocialProof } from "@/components/coastalradio/coastal-social-proof"
import { CoastalFinalCta } from "@/components/coastalradio/coastal-final-cta"
import { CoBrandLockup } from "@/components/coastalradio/coastal-lockup"

export const metadata: Metadata = {
  title: "Coastal Radio × EatinOut — Save up to 50% dining out locally",
  description:
    "Exclusive Coastal Radio partner offer. Join EatinOut free for 30 days and save up to 50% at local restaurants across Blackpool, the Fylde Coast and Lancashire.",
  robots: { index: false, follow: false },
}

/**
 * Isolated co-branded Coastal Radio × EatinOut acquisition page.
 * Coastal palette is scoped locally here so nothing global is touched.
 * Every CTA points to the existing /sign-up flow.
 */
const coastalTheme: CSSProperties = {
  // Coastal Radio campaign palette (placeholder values pending official assets)
  ["--cr-purple" as string]: "#6d1b7b",
  ["--cr-deep" as string]: "#2a0a3d",
  ["--cr-magenta" as string]: "#e0218a",
}

export default function CoastalRadioPage() {
  return (
    <main style={coastalTheme} className="bg-white text-[var(--eo-ink)]">
      <CoastalHeader />
      <CoastalHero />
      <CoastalTrustStrip />
      <CoastalValue />
      <CoastalOccasions />
      <CoastalHowItWorks />
      <CoastalSocialProof />
      <CoastalFinalCta />

      <footer className="bg-[var(--cr-deep)] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
          <CoBrandLockup tone="light" />
          <p className="text-xs text-white/60">
            EatinOut partner campaign for Coastal Radio listeners. Offers and savings vary by venue.
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
