import Image from "next/image"
import { CoastalWordmark } from "./coastal-wordmark"

/**
 * Prominent co-brand header: Coastal Radio (placeholder) × EatinOut.
 * Pale neutral background, generous height, logos clearly readable.
 * Isolated to the /coastalradio campaign.
 */
export function CoastalHeader() {
  return (
    <header className="border-b border-black/5 bg-[var(--cr-pale)]">
      <div className="mx-auto flex min-h-[80px] max-w-6xl flex-col items-center justify-center gap-1.5 px-5 py-3 sm:min-h-[88px]">
        <div className="flex items-center gap-4 sm:gap-6">
          <CoastalWordmark className="text-[26px] sm:text-[32px]" />

          <span className="text-lg font-light text-black/25 sm:text-xl" aria-hidden="true">
            &times;
          </span>

          <Image
            src="/eatinout-logo.webp"
            alt="EatinOut"
            width={600}
            height={200}
            priority
            className="h-11 w-auto sm:h-14"
          />
        </div>
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.28em] text-black/45 sm:text-[0.68rem]">
          Official local dining partnership
        </p>
      </div>
    </header>
  )
}
