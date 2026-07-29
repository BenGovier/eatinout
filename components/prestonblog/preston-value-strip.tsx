import { PoundSterling, MapPin, RefreshCw, Store } from "lucide-react"
import { Reveal } from "./reveal"

const values = [
  { icon: PoundSterling, label: "Up to 50% off your bill" },
  { icon: MapPin, label: "450+ Lancashire offers" },
  { icon: RefreshCw, label: "Use it as often as you like" },
  { icon: Store, label: "Support local restaurants" },
]

/**
 * Quick, scannable value strip directly under the hero. Reinforces that
 * EatinOut is a repeat-use local membership — not a one-off voucher.
 */
export function PrestonValueStrip() {
  return (
    <section className="border-b border-black/5 bg-white py-8 sm:py-10">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4">
            {values.map((v) => (
              <li key={v.label} className="flex flex-col items-center gap-2 text-center lg:flex-row lg:text-left">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--eo-red)]/10">
                  <v.icon className="h-5 w-5 text-[var(--eo-red)]" />
                </span>
                <span className="text-sm font-semibold leading-tight text-[var(--eo-ink)] sm:text-base">
                  {v.label}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
