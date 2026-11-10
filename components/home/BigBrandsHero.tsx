import Image from "next/image"

export function BigBrandsHero() {
  return (
    <section aria-labelledby="big-brands-hero-heading" className="relative overflow-hidden rounded-2xl bg-[#FFF3E6]">
      <Image
        src="/images/big-brands-hero.png"
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 100vw, 1024px"
        className="object-cover object-right"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#FFF3E6] via-[#FFF3E6]/85 to-transparent"
      />
      <div className="relative flex max-w-[62%] flex-col items-start gap-3 px-4 py-5 md:max-w-md md:px-8 md:py-10">
        <span className="rounded-full bg-[#DC3545] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          {"BIG BRANDS \u2022 FREE DEALS"}
        </span>
        <h1
          id="big-brands-hero-heading"
          className="text-balance text-[28px] font-extrabold leading-[1.05] text-gray-900 md:text-5xl"
        >
          Big brands.
          <br />
          Better deals.
        </h1>
        <p className="text-sm leading-snug text-gray-600 md:text-base">Discover offers from brands you love.</p>
        <a
          href="#big-brands"
          className="mt-1 inline-flex min-h-11 items-center rounded-xl bg-[#DC3545] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c82333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC3545] focus-visible:ring-offset-2"
        >
          Explore Big Brands
        </a>
      </div>
    </section>
  )
}
