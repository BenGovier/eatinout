import Image from "next/image"
import Link from "next/link"

/**
 * Compact campaign header for the /prestonblog BlogPreston landing page.
 * ~60px on mobile. Production EatinOut logo on the left, one small
 * "Start free trial" CTA on the right. No nav, no login, no hamburger.
 * Consumes the existing /sign-up route only.
 */
export function CampaignHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[60px] max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link href="/prestonblog" aria-label="EatinOut" className="inline-flex items-center">
          <Image
            src="/eatinout-logo.webp"
            alt="EatinOut"
            width={600}
            height={200}
            priority
            className="h-7 w-auto sm:h-8"
          />
        </Link>

        <Link
          href="/sign-up"
          className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-[var(--eo-red)] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#b8031f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--eo-red)]/30 sm:px-5"
        >
          Start free trial
        </Link>
      </div>
    </header>
  )
}
