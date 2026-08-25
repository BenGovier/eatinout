import Image from "next/image"
import Link from "next/link"

/**
 * Minimal, transparent header that sits over the immersive hero.
 * Uses the white EatinOut lockup directly on the image — no white chip.
 * Isolated to the /prestonblog landing page.
 */
export function PrestonHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Image
          src="/images/prestonblog/eatinout-logo-white.png"
          alt="EatinOut"
          width={1800}
          height={430}
          priority
          className="h-7 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:h-8"
        />

        <Link
          href="/sign-up"
          className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          Start free trial
        </Link>
      </div>
    </header>
  )
}
