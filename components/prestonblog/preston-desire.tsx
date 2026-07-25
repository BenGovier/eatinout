import Image from "next/image"
import { Reveal } from "./reveal"
import { displayFont } from "@/app/prestonblog/fonts"

/**
 * Emotional "create desire" band. Overlapping lifestyle imagery, minimal copy.
 * Sells the night out — the saving just makes it easier to say yes.
 */
export function PrestonDesire() {
  return (
    <section className="overflow-hidden bg-white py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
        {/* Overlapping images */}
        <Reveal className="relative">
          <div className="relative aspect-[4/5] w-4/5 overflow-hidden rounded-3xl shadow-xl shadow-black/15">
            <Image
              src="/images/prestonblog/restaurant-cocktails.png"
              alt="Cocktails at a stylish Preston bar"
              fill
              sizes="(max-width: 1024px) 80vw, 40vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-6 right-0 aspect-square w-1/2 overflow-hidden rounded-3xl shadow-2xl shadow-black/25 ring-4 ring-white">
            <Image
              src="/images/prestonblog/food-brunch.png"
              alt="Weekend brunch in Preston"
              fill
              sizes="(max-width: 1024px) 40vw, 20vw"
              className="object-cover"
            />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--eo-red)]">Go out more</p>
          <h2 className={`${displayFont.className} mt-4 text-balance text-4xl font-bold leading-tight text-[var(--eo-ink)] sm:text-5xl`}>
            Say yes to the table you&apos;d normally talk yourself out of
          </h2>
          <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-[var(--eo-muted)]">
            Friday cocktails. The long Sunday roast. That little Italian you keep meaning to try. With EatinOut, the
            good nights out cost less — so you can have more of them.
          </p>
          <ul className="mt-7 grid grid-cols-2 gap-x-4 gap-y-3 text-base font-medium text-[var(--eo-ink)]">
            <li>Date nights</li>
            <li>Family meals</li>
            <li>Cocktails &amp; catch-ups</li>
            <li>Weekend brunch</li>
            <li>Celebrations</li>
            <li>Treating yourself</li>
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
