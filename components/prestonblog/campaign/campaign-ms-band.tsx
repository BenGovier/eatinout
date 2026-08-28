import Image from "next/image"
import { Reveal } from "@/components/prestonblog/reveal"

/**
 * Compact £25 M&S gift card promotional band, placed immediately before the
 * final CTA as a conversion accelerator. Uses the existing approved M&S
 * artwork. The qualifying condition below is a PLACEHOLDER — confirm and
 * replace with the promotion's actual terms before going live.
 */
export function CampaignMsBand() {
  return (
    <section className="bg-[var(--eo-ink)] py-10 sm:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Reveal>
          <div className="flex flex-col items-center gap-5 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 sm:flex-row sm:gap-7 sm:p-6">
            <Image
              src="/images/prestonblog/ms-giftcard-flat.png"
              alt="Marks &amp; Spencer gift card"
              width={220}
              height={220}
              className="h-24 w-auto shrink-0 rounded-lg shadow-lg sm:h-28"
            />
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--eo-teal)]">
                New member bonus
              </p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                £25 M&amp;S gift card
              </p>
              {/* PLACEHOLDER qualifying condition — confirm actual promotion terms */}
              <p className="mt-2 text-pretty text-sm leading-relaxed text-white/70">
                Stay a member for 6 months and we&apos;ll send you a £25 M&amp;S gift card as a thank you.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
