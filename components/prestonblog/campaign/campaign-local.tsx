import { Reveal } from "@/components/prestonblog/reveal"

/**
 * Local reassurance strip that appears immediately after the hero.
 * Its only job is to say "this is local to you" — no restaurant logos,
 * no specific offers, no town directory.
 */
const CONTEXT = ["Preston", "Lancashire", "Local restaurants", "Up to 50% off"]

export function CampaignLocal() {
  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Reveal>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl">
            Made for people who love eating out locally.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-[var(--eo-muted)]">
            EatinOut helps people across Preston and Lancashire discover restaurant offers nearby — from casual
            lunches and family meals to date nights and drinks with friends.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2.5 sm:gap-x-4">
            {CONTEXT.map((c) => (
              <li
                key={c}
                className="rounded-full bg-[var(--eo-bg)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--eo-ink)] ring-1 ring-black/5"
              >
                {c}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
