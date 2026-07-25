import { Reveal } from "./reveal"

export function PrestonSavings() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-3xl px-5">
        <Reveal>
          <div className="overflow-hidden rounded-3xl bg-[var(--eo-ink)] p-8 text-center shadow-2xl shadow-black/20 sm:p-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-white/60">
              Do the maths
            </p>

            <div className="mt-8 grid grid-cols-3 items-center gap-2 sm:gap-4">
              <div>
                <p className="text-xs font-medium text-white/60 sm:text-sm">Typical Meal</p>
                <p className="mt-1 text-2xl font-bold text-white/70 line-through sm:text-4xl">£60</p>
              </div>
              <div>
                <p className="text-xs font-medium text-white/60 sm:text-sm">With EatinOut</p>
                <p className="mt-1 text-2xl font-extrabold text-[var(--eo-teal)] sm:text-4xl">£30</p>
              </div>
              <div>
                <p className="text-xs font-medium text-white/60 sm:text-sm">You Save</p>
                <p className="mt-1 text-2xl font-extrabold text-[var(--eo-red)] sm:text-4xl">£30</p>
              </div>
            </div>

            <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
              <p className="text-pretty text-base font-medium text-white sm:text-lg">
                One meal could save more than six months of membership.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
