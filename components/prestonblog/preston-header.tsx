import Image from "next/image"
import Link from "next/link"

/**
 * Minimal, transparent header that sits over the immersive hero.
 * Logo sits in a clean white chip so it reads on the dark image.
 * Isolated to the /prestonblog landing page.
 */
export function PrestonHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="inline-flex items-center rounded-full bg-white/95 px-3.5 py-2 shadow-sm ring-1 ring-black/5">
          <Image
            src="/eatinout-logo.webp"
            alt="EatinOut"
            width={112}
            height={26}
            priority
            className="h-6 w-auto"
          />
        </span>

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
