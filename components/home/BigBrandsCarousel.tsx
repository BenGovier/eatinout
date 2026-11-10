"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Tag } from "lucide-react"

export type BigBrandOffer = {
  id: string
  title: string
  deal_label: string
  description: string | null
  terms: string | null
  offer_image_url: string
  starts_at: string
  ends_at: string | null
  brand: { name: string; slug: string; logo_url: string }
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; offers: BigBrandOffer[] }
  | { status: "error" }

function NoticeCard({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#DC3545]/10">
        <Tag className="h-5 w-5 text-[#DC3545]" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-gray-900">{message}</p>
    </div>
  )
}

const CARD_CLASS =
  "w-[82%] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"

function LoadingCards() {
  return (
    <ul aria-hidden="true" className="-mx-4 flex gap-3 overflow-hidden px-4 pb-2">
      {[0, 1].map((i) => (
        <li key={i} className={CARD_CLASS}>
          <div className="aspect-video w-full animate-pulse bg-gray-100" />
          <div className="flex items-center gap-3 p-3">
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function BigBrandsCarousel() {
  const [state, setState] = useState<LoadState>({ status: "loading" })

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/big-brands", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("unavailable")
        const body = (await res.json()) as { offers?: BigBrandOffer[] }
        setState({ status: "ready", offers: Array.isArray(body.offers) ? body.offers : [] })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" })
      })
    return () => controller.abort()
  }, [])

  const offers = state.status === "ready" ? state.offers : []
  const hasOffers = offers.length > 0

  return (
    <section id="big-brands" aria-labelledby="big-brands-heading" aria-busy={state.status === "loading"} className="scroll-mt-24">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id="big-brands-heading" className="text-xl font-extrabold text-gray-900">
            Big Brands
          </h2>
          <p className="text-sm text-gray-600">Free account to claim. No subscription.</p>
        </div>
        {hasOffers && (
          <a href="#big-brands" className="shrink-0 py-1 text-sm font-semibold text-[#DC3545] hover:underline">
            See all
          </a>
        )}
      </div>

      {state.status === "loading" && <LoadingCards />}

      {state.status === "error" && <NoticeCard message="Big Brand deals are unavailable right now. Please check back soon." />}

      {state.status === "ready" && !hasOffers && <NoticeCard message="Big Brand deals are on their way." />}

      {hasOffers && (
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {offers.map((offer) => (
            <li key={offer.id} className={CARD_CLASS}>
              <Link
                href={`/big-brands/${offer.id}`}
                className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC3545] focus-visible:ring-offset-2"
              >
              <div className="relative aspect-video w-full bg-gray-100">
                <Image src={offer.offer_image_url} alt={offer.title} fill sizes="320px" className="object-cover" />
                <span className="absolute left-3 top-3 rounded-md bg-[#DC3545] px-2 py-1 text-xs font-bold text-white">
                  {offer.deal_label}
                </span>
              </div>
              <div className="flex items-center gap-3 p-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-white">
                  <Image
                    src={offer.brand.logo_url}
                    alt={`${offer.brand.name} logo`}
                    fill
                    sizes="44px"
                    className="object-contain p-1"
                  />
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-bold text-gray-900">{offer.title}</p>
                  <p className="truncate text-xs text-gray-500">{offer.brand.name}</p>
                </div>
              </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
