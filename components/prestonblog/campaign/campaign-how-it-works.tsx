import { Reveal } from "@/components/prestonblog/reveal"

/**
 * "How it works" — clean editorial 01/02/03 progression, no big cards.
 */
const STEPS = [
  { n: "01", title: "Join free", copy: "Start your 30-day free trial." },
  { n: "02", title: "Find somewhere you fancy", copy: "Browse participating restaurants and current offers." },
  { n: "03", title: "Eat out & save", copy: "Follow the offer instructions when you visit." },
]

export function CampaignHowItWorks() {
  return (
    <section className="bg-[var(--eo-bg)] py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-[var(--eo-ink)] sm:text-4xl">
            Saving locally is easy.
          </h2>
        </Reveal>

        <div className="mt-10 divide-y divide-black/10 border-y border-black/10">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="flex items-baseline gap-5 py-6 sm:gap-8">
                <span className="text-3xl font-extrabold tabular-nums text-[var(--eo-red)] sm:text-4xl">{s.n}</span>
                <div>
                  <h3 className="text-lg font-bold text-[var(--eo-ink)] sm:text-xl">{s.title}</h3>
                  <p className="mt-1 text-pretty text-base leading-relaxed text-[var(--eo-muted)]">{s.copy}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
