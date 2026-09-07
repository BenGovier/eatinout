/**
 * Bold full-width Coastal-purple listener offer strip directly beneath the hero.
 * No card, no border radius. Includes a small radio-wave motif. No CTA here.
 * Isolated to the /coastalradio campaign.
 */
export function CoastalTrustStrip() {
  return (
    <section className="bg-[var(--cr-magenta)]">
      <div className="mx-auto flex min-h-[96px] max-w-5xl items-center gap-4 px-5 py-4 sm:min-h-[104px] sm:gap-5 sm:px-6">
        <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0 sm:h-11 sm:w-11" aria-hidden="true" fill="none">
          <circle cx="16" cy="16" r="3.5" fill="white" />
          <path
            d="M9.5 22.5a9 9 0 0 1 0-13M6 26a14 14 0 0 1 0-20"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M22.5 9.5a9 9 0 0 1 0 13M26 6a14 14 0 0 1 0 20"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Coastal Radio listener offer</p>
          <p className="mt-1 text-pretty text-sm font-semibold leading-snug text-white sm:text-base">
            Save up to 50% at participating restaurants across the Fylde Coast &amp; Lancashire.
          </p>
        </div>
      </div>
    </section>
  )
}
