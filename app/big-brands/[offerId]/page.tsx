"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, CalendarClock, Check, ChevronDown, Copy, ExternalLink, Loader2, Tag } from "lucide-react"
import { Logo } from "@/components/logo"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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

type ClaimResult =
  | { redemption_method: "link"; destination_url: string }
  | { redemption_method: "code"; voucher_code: string }
  | { redemption_method: "link_and_code"; destination_url: string; voucher_code: string }

type CodeClaim = { voucherCode: string; destinationUrl: string | null }

const CLAIM_ERROR_MESSAGES: Record<number, string> = {
  404: "This offer is no longer available to claim.",
}
const GENERIC_CLAIM_ERROR = "We couldn't get this deal right now. Please try again."

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

function hasCode(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== ""
}

function GetDealBar({
  isClaiming,
  error,
  onClaim,
}: {
  isClaiming: boolean
  error: string | null
  onClaim: () => void
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto max-w-xl px-4 py-3">
        {error && (
          <p role="alert" className="mb-2 rounded-lg bg-[#DC3545]/10 px-3 py-2 text-center text-sm font-medium text-[#a71d2a]">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={onClaim}
          disabled={isClaiming}
          aria-busy={isClaiming}
          aria-describedby="get-deal-note"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#DC3545] py-3.5 text-base font-bold text-white shadow-sm hover:bg-[#c82333] disabled:cursor-wait disabled:opacity-80"
        >
          {isClaiming && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {isClaiming ? "Getting your deal..." : "Get Deal"}
        </button>
        <p id="get-deal-note" className="mt-2 text-center text-xs text-gray-600">
          Free EatinOut account required. No subscription.
        </p>
      </div>
    </div>
  )
}

function VoucherCodeDialog({
  claim,
  brandName,
  onOpenChange,
}: {
  claim: CodeClaim | null
  brandName: string
  onOpenChange: (open: boolean) => void
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle")

  const copyCode = async () => {
    if (!claim) return
    try {
      await navigator.clipboard.writeText(claim.voucherCode)
      setCopyState("copied")
    } catch {
      setCopyState("failed")
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) setCopyState("idle")
    onOpenChange(open)
  }

  return (
    <Dialog open={claim !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl p-5 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="pr-6 text-lg font-extrabold text-gray-900">Your {brandName} code</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {claim?.destinationUrl
              ? "Copy the code, then use it on the brand's website."
              : "Copy the code and use it when you order."}
          </DialogDescription>
        </DialogHeader>

        {claim && (
          <div className="flex flex-col gap-3">
            <p className="select-all break-all rounded-xl border-2 border-dashed border-[#DC3545]/40 bg-[#DC3545]/5 px-4 py-3 text-center font-mono text-xl font-bold tracking-wider text-gray-900">
              {claim.voucherCode}
            </p>
            <button
              type="button"
              onClick={copyCode}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white py-3 text-base font-bold text-gray-900 hover:bg-gray-50"
            >
              {copyState === "copied" ? (
                <Check className="h-5 w-5 text-green-600" aria-hidden="true" />
              ) : (
                <Copy className="h-5 w-5" aria-hidden="true" />
              )}
              {copyState === "copied" ? "Copied" : "Copy code"}
            </button>
            <p aria-live="polite" className="min-h-4 text-center text-xs text-gray-600">
              {copyState === "failed" && "Copying isn't available here. Press and hold the code to copy it."}
            </p>
            {claim.destinationUrl && (
              <a
                href={claim.destinationUrl}
                target="_blank"
                rel="noopener"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#DC3545] py-3 text-base font-bold text-white hover:bg-[#c82333]"
              >
                Visit Offer
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function useClaimOffer(offerId: string) {
  const router = useRouter()
  const inFlight = useRef(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codeClaim, setCodeClaim] = useState<CodeClaim | null>(null)

  const claim = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setIsClaiming(true)
    setError(null)
    let keepLoading = false

    try {
      const res = await fetch(`/api/big-brands/${encodeURIComponent(offerId)}/claim`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      })

      if (res.status === 401) {
        keepLoading = true
        router.push(`/join?plan=free&returnUrl=${encodeURIComponent(`/big-brands/${offerId}`)}`)
        return
      }
      if (!res.ok) {
        setError(CLAIM_ERROR_MESSAGES[res.status] ?? GENERIC_CLAIM_ERROR)
        return
      }

      const body = (await res.json()) as Partial<ClaimResult> & { destination_url?: unknown; voucher_code?: unknown }
      const method = body.redemption_method

      if (method === "link" && isHttpsUrl(body.destination_url)) {
        keepLoading = true
        window.location.assign(body.destination_url)
        return
      }
      if (method === "code" && hasCode(body.voucher_code)) {
        setCodeClaim({ voucherCode: body.voucher_code, destinationUrl: null })
        return
      }
      if (method === "link_and_code" && hasCode(body.voucher_code) && isHttpsUrl(body.destination_url)) {
        setCodeClaim({ voucherCode: body.voucher_code, destinationUrl: body.destination_url })
        return
      }
      setError(GENERIC_CLAIM_ERROR)
    } catch {
      setError(GENERIC_CLAIM_ERROR)
    } finally {
      if (!keepLoading) {
        inFlight.current = false
        setIsClaiming(false)
      }
    }
  }

  return { claim, isClaiming, error, codeClaim, closeCodeClaim: () => setCodeClaim(null) }
}

function ClaimableOffer({ offer, offerId }: { offer: OfferDetail; offerId: string }) {
  const { claim, isClaiming, error, codeClaim, closeCodeClaim } = useClaimOffer(offerId)

  return (
    <>
      <OfferContent offer={offer} />
      <GetDealBar isClaiming={isClaiming} error={error} onClaim={claim} />
      <VoucherCodeDialog
        claim={codeClaim}
        brandName={offer.brand.name}
        onOpenChange={(open) => {
          if (!open) closeCodeClaim()
        }}
      />
    </>
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
        {offer && <ClaimableOffer offer={offer} offerId={offerId} />}
      </main>
    </div>
  )
}
