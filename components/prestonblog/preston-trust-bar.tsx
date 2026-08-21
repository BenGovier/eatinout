import { Utensils } from "lucide-react"

/**
 * PrestonTrustBar
 * Premium trust strip that replaces the old "450+ offers" hero pill.
 * Shows a reassurance headline above an infinite, auto-scrolling logo
 * carousel. Logos are PLACEHOLDERS only (styled wordmark chips) — real
 * partner logos will be dropped in later by swapping the `placeholderLogos`
 * entries. Animation, pause-on-hover and edge-fade are all self-contained
 * so no global styles are touched.
 */

// Placeholder partner names — visually stand in for real restaurant logos.
const placeholderLogos = [
  "The Ivy House",
  "Bella Cucina",
  "Riverside Grill",
  "Copper & Oak",
  "The Spice Room",
  "Harbour Kitchen",
  "Nonna's Table",
  "The Old Bakery",
]

function LogoChip({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5 whitespace-nowrap px-6 sm:px-8" aria-hidden="true">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--eo-ink)]/5 text-[var(--eo-ink)]/40">
        <Utensils className="h-4 w-4" />
      </span>
      <span className="text-lg font-bold tracking-tight text-[var(--eo-ink)]/35 sm:text-xl">{name}</span>
    </div>
  )
}

export function PrestonTrustBar() {
  // Duplicated once so the -50% keyframe produces a seamless infinite loop.
  const track = [...placeholderLogos, ...placeholderLogos]

  return (
    <section aria-label="Trusted by restaurants across Lancashire" className="border-b border-black/5 bg-white py-10 sm:py-12">
      <p className="px-5 text-center text-sm font-semibold uppercase tracking-[0.18em] text-[var(--eo-muted)]">
        Trusted by 450+ restaurants across Lancashire
      </p>

      {/* Marquee viewport: fades at both edges, pauses on hover (desktop). */}
      <div className="preston-marquee group relative mt-7 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
        <div className="preston-marquee-track flex w-max items-center">
          {track.map((name, i) => (
            <LogoChip key={`${name}-${i}`} name={name} />
          ))}
        </div>
      </div>

      {/* Self-contained animation. Scoped by the .preston-marquee class so it
          never leaks into other components or the global stylesheet. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes preston-marquee-scroll {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
            .preston-marquee-track {
              animation: preston-marquee-scroll 40s linear infinite;
            }
            .preston-marquee:hover .preston-marquee-track {
              animation-play-state: paused;
            }
            @media (max-width: 640px) {
              .preston-marquee-track { animation-duration: 24s; }
            }
            @media (prefers-reduced-motion: reduce) {
              .preston-marquee-track { animation: none; }
            }
          `,
        }}
      />
    </section>
  )
}
