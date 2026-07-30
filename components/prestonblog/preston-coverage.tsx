import { MapPin } from "lucide-react"
import { Reveal } from "./reveal"
import { LANCASHIRE_TOWNS } from "./offers-data"

/**
 * Coverage section. Instead of listing individual restaurants, it shows the
 * Lancashire towns covered — instant reassurance that there are offers nearby,
 * wherever the visitor lives.
 */
export function PrestonCoverage() {
  return (
    <section className="bg-[var(--eo-teal-100)] py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-5 text-center">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--eo-teal)]">Right on your doorstep</p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl md:text-5xl">
            Offers all across Lancashire
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-[var(--eo-muted)]">
            Wherever you are, there are places to enjoy nearby.
          </p>
        </Reveal>

        <Reveal delay={0.05}>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-2.5 sm:gap-3">
            {LANCASHIRE_TOWNS.map((town) => (
              <li
                key={town}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--eo-ink)] shadow-sm ring-1 ring-black/5 sm:text-base"
              >
                <MapPin className="h-4 w-4 text-[var(--eo-red)]" />
                {town}
              </li>
            ))}
            <li className="inline-flex items-center rounded-full bg-[var(--eo-ink)] px-4 py-2 text-sm font-semibold text-white sm:text-base">
              …and many more
            </li>
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
