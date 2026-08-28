/**
 * Compact Coastal-purple reassurance strip directly after the hero.
 * Flat colour block — no card, shadow, or rounded panel.
 */
export function CoastalTrustStrip() {
  return (
    <section className="bg-[var(--cr-purple)]">
      <div className="mx-auto max-w-3xl px-4 py-7 text-center sm:px-6 sm:py-8">
        <p className="text-balance text-lg font-bold text-white sm:text-xl">
          A special local dining offer for Coastal Radio listeners.
        </p>
        <p className="mt-1.5 text-pretty text-sm leading-relaxed text-white/80 sm:text-base">
          Enjoy restaurant savings across Blackpool, the Fylde Coast and Lancashire.
        </p>
      </div>
    </section>
  )
}
