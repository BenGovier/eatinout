"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  OfferImageUploader,
  type EditorBrand,
  type EditorOffer,
} from "@/components/admin/national/offer-image-uploader"

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-green-100 text-green-800",
  paused: "bg-amber-100 text-amber-800",
  archived: "bg-slate-200 text-slate-700",
}

const REDEMPTION_LABELS: Record<string, string> = {
  link: "Link",
  code: "Code",
  link_and_code: "Link + Code",
}

function formatDateTime(value: string | null) {
  if (!value) return "Not set"
  const date = new Date(value)
  if (isNaN(date.getTime())) return "Not set"
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? ""
}

export default function AdminNationalOfferEditorPage() {
  const params = useParams<{ id: string; offerId: string }>()
  const brandId = single(params.id)
  const offerId = single(params.offerId)

  const [brand, setBrand] = useState<EditorBrand | null>(null)
  const [offer, setOffer] = useState<EditorOffer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/admin/national/brands/${encodeURIComponent(brandId)}/offers/${encodeURIComponent(offerId)}`,
        { credentials: "include", cache: "no-store" },
      )
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        setError({ message: data?.message || "Failed to load offer", notFound: response.status === 404 })
        return
      }
      setBrand(data.brand)
      setOffer(data.offer)
    } catch {
      setError({ message: "Failed to load offer", notFound: false })
    } finally {
      setLoading(false)
    }
  }, [brandId, offerId])

  useEffect(() => {
    void load()
  }, [load])

  const brandHref = `/admin/national/brands/${encodeURIComponent(brandId)}`

  const backLink = (
    <Link
      href={brandHref}
      className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-red-700"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {brand ? `Back to ${brand.name}` : "Back to brand"}
    </Link>
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {backLink}
        <div className="flex items-center gap-2 py-16 text-gray-500" role="status">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Loading offer…
        </div>
      </div>
    )
  }

  if (error || !brand || !offer) {
    return (
      <div className="flex flex-col gap-4">
        {backLink}
        <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            {error?.notFound ? "This offer does not exist for this brand." : error?.message ?? "Failed to load offer"}
          </p>
          {!error?.notFound ? (
            <Button type="button" variant="outline" onClick={() => void load()} className="bg-white">
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  const status = offer.publication_status ?? "draft"

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      <header className="flex flex-col gap-2">
        <p className="text-sm text-gray-500">{brand.name} · National offer</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-balance text-2xl font-bold text-gray-900 sm:text-3xl">{offer.title}</h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
          >
            {status}
          </span>
        </div>
        <p className="text-xs text-gray-500">Publishing is not available yet. Offers remain in their current status.</p>
      </header>

      <OfferImageUploader offer={offer} brand={brand} onSaved={setOffer} />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-red-700">Offer details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-gray-500">Deal label</dt>
              <dd className="font-medium text-gray-900">{offer.deal_label || "None"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Redemption</dt>
              <dd className="font-medium text-gray-900">
                {REDEMPTION_LABELS[offer.redemption_method ?? ""] ?? "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Starts</dt>
              <dd className="font-medium text-gray-900">{formatDateTime(offer.starts_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Expires</dt>
              <dd className="font-medium text-gray-900">{offer.ends_at ? formatDateTime(offer.ends_at) : "No expiry"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500">Description</dt>
              <dd className="whitespace-pre-line text-gray-900">{offer.description || "None"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500">Terms</dt>
              <dd className="whitespace-pre-line text-gray-900">{offer.terms || "None"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
