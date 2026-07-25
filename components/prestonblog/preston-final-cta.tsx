import { PrestonCtaButton } from "./preston-cta-button"
import { Reveal } from "./reveal"

export function PrestonFinalCta() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-4xl px-5">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-[var(--eo-red)] px-6 py-14 text-center shadow-2xl shadow-[var(--eo-red)]/25 sm:px-12 sm:py-16">
            {/* Soft radial highlight */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                background:
                  "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 55%)",
              }}
            />
            <div className="relative">
              <h2 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Ready to save on your next meal?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-pretty text-lg text-white/90">
                Join today and enjoy your first 30 days completely FREE.
              </p>

              <div className="mt-9 flex justify-center">
                <PrestonCtaButton
                  className="[&_a]:bg-white [&_a]:text-[var(--eo-red)] [&_a]:shadow-black/10 [&_a:hover]:bg-white/90"
                />
              </div>

              <p className="mt-5 text-sm text-white/80">Then just £4.99/month. Cancel anytime.</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
