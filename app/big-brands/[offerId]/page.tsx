"use client"

import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, CalendarClock, ChevronDown, Tag } from "lucide-react"
import { Logo } from "@/components/logo"

type OfferDetail = {
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

class OfferRequestError extends Error {
  constructor(public status: number) {
    super(`Offer request failed with ${status}`)
  }
}

async function fetchOffer(offerId: string): Promise<OfferDetail> {
  const res = await fetch(`/api/big-brands/${encodeURIComponent(offerId)}`)
  if (!res.ok) throw new OfferRequestError(res.status)
  const body = (await res.json()) as { offer: OfferDetail }
  return body.offer
}

function formatExpiry(endsAt: string) {
  return new Date(endsAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function PageHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
        <Link
          href="/restaurants#big-brands"
          className="-ml-2 flex items-center gap-1 rounded-md p-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>
        <Logo href="/restaurants" size="medium" />
        <span className="w-14" aria-hidden="true" />
      </div>
    </header>
  )
}

function StatusMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#DC3545]/10">
        <Tag className="h-5 w-5 text-[#DC3545]" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-extrabold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
      <Link
        href="/restaurants#big-brands"
        className="mt-6 inline-flex rounded-full bg-[#DC3545] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#c82333]"
      >
        Browse Big Brands
      </Link>
    </div>
  )
}

function LoadingState() {
  return (
    <div aria-busy="true" aria-label="Loading offer" className="mx-auto max-w-xl px-4 pt-4">
      <div className="aspect-video w-full animate-pulse rounded-2xl bg-gray-100" />
      <div className="mt-4 flex items-center gap-3">
        <div className="h-14 w-14 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="mt-4 h-6 w-3/4 animate-pulse rounded bg-gray-100" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-gray-100" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-gray-100" />
    </div>
  )
}

function GetDealBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto max-w-xl px-4 py-3">
        <button
          type="button"
          disabled
          aria-describedby="get-deal-note"
          className="w-full rounded-full bg-[#DC3545] py-3.5 text-base font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-90"
        >
          Get Deal
        </button>
        <p id="get-deal-note" className="mt-2 text-center text-xs text-gray-600">
          Free EatinOut account required. No subscription.
          <span className="block text-gray-500">Claiming opens soon.</span>
        </p>
      </div>
    </div>
  )
}

function OfferContent({ offer }: { offer: OfferDetail }) {
  return (
    <article className="mx-auto max-w-xl px-4 pb-40 pt-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
        <Image
          src={offer.offer_image_url}
          alt={`${offer.brand.name}: ${offer.title}`}
          fill
          priority
          sizes="(max-width: 576px) 100vw, 544px"
          className="object-contain"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <Image
            src={offer.brand.logo_url}
            alt={`${offer.brand.name} logo`}
            fill
            sizes="56px"
            className="object-contain p-1.5"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-gray-900">{offer.brand.name}</p>
          <span className="mt-1 inline-flex rounded-md bg-[#DC3545] px-2 py-0.5 text-xs font-bold text-white">
            {offer.deal_label}
          </span>
        </div>
      </div>

      <h1 className="mt-4 text-pretty text-2xl font-extrabold leading-tight text-gray-900">{offer.title}</h1>

      {offer.ends_at && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-[#DC3545]/5 px-3 py-2 text-sm font-semibold text-gray-800">
          <CalendarClock className="h-4 w-4 shrink-0 text-[#DC3545]" aria-hidden="true" />
          {"Expires "}
          <time dateTime={offer.ends_at}>{formatExpiry(offer.ends_at)}</time>
        </p>
      )}

      {offer.description && (
        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-gray-700">{offer.description}</p>
      )}

      {offer.terms && (
        <details className="group mt-6 rounded-2xl border border-gray-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-base font-bold text-gray-900 [&::-webkit-details-marker]:hidden">
            Terms and conditions
            <ChevronDown
              className="h-5 w-5 shrink-0 text-gray-500 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="whitespace-pre-line border-t border-gray-100 px-4 py-3.5 text-sm leading-relaxed text-gray-700">
            {offer.terms}
          </div>
        </details>
      )}
    </article>
  )
}

export default function BigBrandOfferPage() {
  const { offerId } = useParams<{ offerId: string }>()

  const { data: offer, error, isPending } = useQuery({
    queryKey: ["big-brand-offer", offerId],
    queryFn: () => fetchOffer(offerId),
    enabled: Boolean(offerId),
    retry: (failureCount, err) => !(err instanceof OfferRequestError && err.status === 404) && failureCount < 2,
  })

  const isNotFound = error instanceof OfferRequestError && error.status === 404

  return (
    <div className="min-h-screen bg-white">
      <PageHeader />
      <main>
        {isPending && <LoadingState />}
        {isNotFound && (
          <StatusMessage title="Offer not available" message="This deal has ended or is no longer available." />
        )}
        {error && !isNotFound && (
          <StatusMessage title="Something went wrong" message="This offer is unavailable right now. Please try again soon." />
        )}
        {offer && (
          <>
            <OfferContent offer={offer} />
            <GetDealBar />
          </>
        )}
      </main>
    </div>
  )
}
