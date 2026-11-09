"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  Store,
  Tag,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogoUploadField } from "@/components/admin/national/logo-upload-field"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type BrandStatus = "draft" | "active" | "paused" | "archived"

interface NationalBrand {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  affiliate_network: string | null
  status: BrandStatus
  created_at: string
  updated_at: string
}

type PublicationStatus = "draft" | "published" | "paused" | "archived"

interface OfferSummary {
  id: string
  title: string
  publication_status: PublicationStatus | null
  starts_at: string | null
  ends_at: string | null
  created_at: string | null
}

interface BrandDetail {
  brand: NationalBrand
  canActivate: boolean
  offers: OfferSummary[]
  offerCount: number | null
  offersAvailable: boolean
}

type FormValues = {
  name: string
  description: string
  website_url: string
  affiliate_network: string
}

type FieldErrors = Partial<Record<keyof FormValues | "form", string>>

type Notice = { message: string; isWarning: boolean }

const AFFILIATE_NETWORKS = ["CJ", "Impact", "Direct", "Other"] as const
const NO_NETWORK = "none"

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  draft: "bg-gray-50 text-gray-700 border-gray-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-red-50 text-red-700 border-red-200",
  published: "bg-blue-50 text-blue-700 border-blue-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  live: "bg-green-50 text-green-700 border-green-200",
  expired: "bg-gray-100 text-gray-600 border-gray-300",
}

// Display-only: scheduled/live/expired are derived from published offers' dates and never written back.
function offerDisplayState(offer: OfferSummary, now = Date.now()): string | null {
  if (offer.publication_status !== "published") return offer.publication_status
  const startsAt = offer.starts_at ? new Date(offer.starts_at).getTime() : NaN
  const endsAt = offer.ends_at ? new Date(offer.ends_at).getTime() : NaN
  if (!isNaN(startsAt) && startsAt > now) return "scheduled"
  if (!isNaN(endsAt) && endsAt < now) return "expired"
  return "live"
}

function offerDateLabel(offer: OfferSummary, state: string | null) {
  if (state === "scheduled") return `Starts ${formatDate(offer.starts_at)}`
  if (state === "expired") return `Ended ${formatDate(offer.ends_at)}`
  if (offer.ends_at) return `Ends ${formatDate(offer.ends_at)}`
  if (offer.starts_at) return `Started ${formatDate(offer.starts_at)}`
  return `Added ${formatDate(offer.created_at)}`
}

type StatusAction = {
  target: BrandStatus
  label: string
  title: string
  description: string
  destructive?: boolean
}

const STATUS_ACTIONS: StatusAction[] = [
  {
    target: "active",
    label: "Activate",
    title: "Activate this brand?",
    description: "Active brands can be used for live national offers.",
  },
  {
    target: "paused",
    label: "Pause",
    title: "Pause this brand?",
    description: "Pausing stops this brand from being treated as live. You can reactivate or move it to draft later.",
  },
  {
    target: "draft",
    label: "Move to draft",
    title: "Move this brand to draft?",
    description: "Draft brands are not visible to members.",
  },
  {
    target: "archived",
    label: "Archive",
    title: "Archive this brand?",
    description:
      "Archived brands are retired but never deleted. You can restore an archived brand to draft at any time.",
    destructive: true,
  },
]

function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

function toFormValues(brand: NationalBrand): FormValues {
  return {
    name: brand.name,
    description: brand.description ?? "",
    website_url: brand.website_url ?? "",
    affiliate_network: brand.affiliate_network ?? NO_NETWORK,
  }
}

function validateForm(values: FormValues): FieldErrors {
  const errors: FieldErrors = {}
  const name = values.name.trim()
  if (!name) errors.name = "Brand name is required"
  else if (name.length > 120) errors.name = "Brand name must be 120 characters or fewer"
  else if (!/[a-z0-9]/i.test(name)) errors.name = "Brand name must contain letters or numbers"
  if (values.description.trim().length > 2000) errors.description = "Description must be 2000 characters or fewer"
  if (values.website_url.trim() && !isValidHttpUrl(values.website_url.trim()))
    errors.website_url = "Enter a full URL, e.g. https://example.com"
  return errors
}

function StatusBadge({ status }: { status: string | null }) {
  const value = status ?? "unknown"
  const style = STATUS_STYLES[value] ?? STATUS_STYLES.draft
  return (
    <span className={`inline-block border px-2 py-0.5 rounded-full text-xs font-medium capitalize ${style}`}>
      {value}
    </span>
  )
}

function BrandLogo({ brand }: { brand: NationalBrand }) {
  if (!brand.logo_url) {
    return (
      <div
        className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0"
        aria-hidden="true"
      >
        <Store className="h-7 w-7 text-gray-500" />
      </div>
    )
  }
  return (
    // Plain img avoids requiring next/image remotePatterns for arbitrary brand logo hosts
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brand.logo_url}
      alt={`${brand.name} logo`}
      className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-contain bg-white border flex-shrink-0"
    />
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-sm text-red-600">
      {message}
    </p>
  )
}

function NoticeBanner({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className={`border p-3 rounded-md text-sm flex items-start gap-2 ${
        notice.isWarning ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-green-50 border-green-200 text-green-800"
      }`}
    >
      {notice.isWarning ? (
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
      )}
      <span className="flex-1">{notice.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="flex-shrink-0 rounded hover:opacity-70"
        aria-label="Dismiss message"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-4 animate-pulse" role="status" aria-label="Loading brand">
      <div className="h-4 w-32 bg-gray-200 rounded" />
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 bg-gray-200 rounded-lg" />
        <div className="space-y-2 flex-1">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
      <div className="h-64 bg-gray-200 rounded-lg" />
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/admin/national/brands"
      className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-red-700"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      All national brands
    </Link>
  )
}

function EditBrandForm({
  brand,
  onSaved,
}: {
  brand: NationalBrand
  onSaved: (brand: NationalBrand, notice: Notice) => void
}) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(brand))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  const original = toFormValues(brand)
  const isDirty = (Object.keys(values) as (keyof FormValues)[]).some(
    (key) => values[key].trim() !== original[key].trim(),
  )

  function update(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }))
  }

  function handleCancel() {
    setValues(toFormValues(brand))
    setErrors({})
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving || !isDirty) return

    const clientErrors = validateForm(values)
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    const payload: Record<string, string | null> = {}
    if (values.name.trim() !== original.name.trim()) payload.name = values.name.trim()
    if (values.description.trim() !== original.description.trim())
      payload.description = values.description.trim() || null
    if (values.website_url.trim() !== original.website_url.trim())
      payload.website_url = values.website_url.trim() || null
    if (values.affiliate_network !== original.affiliate_network)
      payload.affiliate_network = values.affiliate_network === NO_NETWORK ? null : values.affiliate_network

    setIsSaving(true)
    setErrors({})
    try {
      const response = await fetch(`/api/admin/national/brands/${encodeURIComponent(brand.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        setErrors({ ...(data?.errors ?? {}), form: data?.message || "Failed to save changes" })
        return
      }
      setValues(toFormValues(data.brand))
      onSaved(data.brand, {
        message: data.unchanged ? "No changes to save." : data.message || "Brand updated.",
        isWarning: Boolean(data.partial),
      })
    } catch {
      setErrors({ form: "Network error. Please try again." })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-red-700">Brand details</CardTitle>
        <CardDescription>
          The URL slug <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{brand.slug}</code> stays the
          same when you rename the brand.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm flex gap-2" role="alert">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{errors.form}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-brand-name">
              Brand name <span className="text-red-600">*</span>
            </Label>
            <Input
              id="edit-brand-name"
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              maxLength={120}
              required
              disabled={isSaving}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "edit-brand-name-error" : undefined}
            />
            <FieldError id="edit-brand-name-error" message={errors.name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-brand-description">Description</Label>
            <Textarea
              id="edit-brand-description"
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              maxLength={2000}
              rows={4}
              disabled={isSaving}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "edit-brand-description-error" : undefined}
            />
            <FieldError id="edit-brand-description-error" message={errors.description} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-brand-website">Website URL</Label>
              <Input
                id="edit-brand-website"
                type="url"
                inputMode="url"
                placeholder="https://example.com"
                value={values.website_url}
                onChange={(e) => update("website_url", e.target.value)}
                disabled={isSaving}
                aria-invalid={Boolean(errors.website_url)}
                aria-describedby={errors.website_url ? "edit-brand-website-error" : undefined}
              />
              <FieldError id="edit-brand-website-error" message={errors.website_url} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-brand-network">Affiliate network</Label>
              <Select
                value={values.affiliate_network}
                onValueChange={(value) => update("affiliate_network", value)}
                disabled={isSaving}
              >
                <SelectTrigger
                  id="edit-brand-network"
                  aria-invalid={Boolean(errors.affiliate_network)}
                  aria-describedby={errors.affiliate_network ? "edit-brand-network-error" : undefined}
                >
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_NETWORK}>None</SelectItem>
                  {AFFILIATE_NETWORKS.map((network) => (
                    <SelectItem key={network} value={network}>
                      {network}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="edit-brand-network-error" message={errors.affiliate_network} />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving || !isDirty}>
              Cancel
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white" disabled={isSaving || !isDirty}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function StatusCard({
  brand,
  canActivate,
  onChanged,
}: {
  brand: NationalBrand
  canActivate: boolean
  onChanged: (brand: NationalBrand, canActivate: boolean, notice: Notice) => void
}) {
  const [pending, setPending] = useState<StatusAction | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  const actions = STATUS_ACTIONS.filter((action) => action.target !== brand.status).map((action) =>
    brand.status === "archived" && action.target === "draft"
      ? {
          ...action,
          label: "Restore to draft",
          title: "Restore this brand to draft?",
          description: "The brand will return to draft and stay hidden from members.",
        }
      : action,
  )

  async function confirmChange() {
    if (!pending || isSaving) return
    setIsSaving(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/national/brands/${encodeURIComponent(brand.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ status: pending.target }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        setError(data?.message || "Failed to change status")
        setPending(null)
        return
      }
      onChanged(data.brand, Boolean(data.canActivate), {
        message: data.unchanged ? "Status is already set." : data.message || "Status changed.",
        isWarning: Boolean(data.partial),
      })
      setPending(null)
    } catch {
      setError("Network error. Please try again.")
      setPending(null)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-red-700">Status</CardTitle>
        <CardDescription className="flex items-center gap-2">
          Current status: <StatusBadge status={brand.status} />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm flex gap-2" role="alert">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {actions.map((action) => {
            const isLocked = action.target === "active" && !canActivate
            return (
              <Button
                key={action.target}
                type="button"
                variant={action.destructive ? "outline" : "outline"}
                className={`justify-start ${action.destructive ? "text-red-700 border-red-200 hover:bg-red-50" : ""}`}
                disabled={isSaving || isLocked}
                onClick={() => setPending(action)}
                aria-describedby={isLocked ? "activate-locked-note" : undefined}
              >
                {isLocked && <Lock className="h-4 w-4 mr-2" aria-hidden="true" />}
                {action.label}
              </Button>
            )
          })}
        </div>

        {brand.status !== "active" && !canActivate && (
          <p id="activate-locked-note" className="text-xs text-gray-500">
            Activation needs an approved brand logo. Logo approval is not available yet.
          </p>
        )}
        <p className="text-xs text-gray-500">Brands are never permanently deleted.</p>
      </CardContent>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && !isSaving && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pending?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              className={pending?.destructive ? "bg-red-600 hover:bg-red-700 text-white" : ""}
              onClick={(event) => {
                event.preventDefault()
                confirmChange()
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                pending?.label
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function OffersCard({ detail }: { detail: BrandDetail }) {
  const { offers, offerCount, offersAvailable } = detail
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-red-700">National offers</CardTitle>
        <CardDescription>
          {offersAvailable
            ? `${offerCount ?? 0} ${offerCount === 1 ? "offer" : "offers"} linked to this brand`
            : "Offer information is unavailable"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!offersAvailable ? (
          <p className="text-sm text-amber-700">Associated offers could not be loaded. Try refreshing the page.</p>
        ) : offers.length === 0 ? (
          <div className="text-center py-6">
            <Tag className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-gray-500 text-sm">No national offers for this brand yet.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {offers.map((offer) => (
              <li key={offer.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{offer.title}</p>
                  <p className="text-xs text-gray-500">
                    {offerDateLabel(offer, offerDisplayState(offer))}
                  </p>
                </div>
                <StatusBadge status={offerDisplayState(offer)} />
              </li>
            ))}
          </ul>
        )}
        {offersAvailable && offerCount !== null && offerCount > offers.length && (
          <p className="text-xs text-gray-500 mt-3">
            Showing the {offers.length} most recent of {offerCount} offers.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function AdminNationalBrandDetailPage() {
  const params = useParams<{ id: string }>()
  const brandId = params?.id ?? ""
  const [detail, setDetail] = useState<BrandDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [notFound, setNotFound] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    if (!brandId) return
    const controller = new AbortController()

    async function loadBrand() {
      try {
        const response = await fetch(`/api/admin/national/brands/${encodeURIComponent(brandId)}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const data = await response.json().catch(() => null)
        if (response.status === 404) {
          setNotFound(true)
          return
        }
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Failed to fetch brand")
        }
        setDetail({
          brand: data.brand,
          canActivate: Boolean(data.canActivate),
          offers: data.offers ?? [],
          offerCount: data.offerCount ?? null,
          offersAvailable: Boolean(data.offersAvailable),
        })
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadBrand()
    return () => controller.abort()
  }, [brandId])

  useEffect(() => {
    if (detail?.brand.name) document.title = `${detail.brand.name} · National Brands`
  }, [detail?.brand.name])

  if (isLoading) return <LoadingState />

  if (notFound) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="text-center py-12 border rounded-lg bg-white">
          <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-gray-800">Brand not found</h1>
          <p className="text-gray-500 text-sm mt-1">It may have been removed or the link is incorrect.</p>
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md" role="alert">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" aria-hidden="true" />
            <h1 className="font-bold">Error</h1>
          </div>
          <p>{error || "Failed to fetch brand"}</p>
        </div>
      </div>
    )
  }

  const { brand } = detail

  return (
    <div className="space-y-6">
      <BackLink />

      <header className="flex items-start gap-4">
        <BrandLogo brand={brand} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 break-words">{brand.name}</h1>
            <StatusBadge status={brand.status} />
          </div>
          <p className="text-sm text-gray-500">
            {brand.affiliate_network || "No affiliate network"} · {detail.offerCount ?? "—"}{" "}
            {detail.offerCount === 1 ? "offer" : "offers"} · Updated {formatDate(brand.updated_at)}
          </p>
          {brand.website_url && (
            <a
              href={brand.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-red-700 hover:underline break-all"
            >
              {brand.website_url}
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
          {brand.description && <p className="text-sm text-gray-700 pt-1 whitespace-pre-line">{brand.description}</p>}
        </div>
      </header>

      {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <EditBrandForm
            key={brand.updated_at}
            brand={brand}
            onSaved={(updated, nextNotice) => {
              setDetail((prev) => (prev ? { ...prev, brand: updated } : prev))
              setNotice(nextNotice)
            }}
          />
          <OffersCard detail={detail} />
        </div>
        <div className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-red-700">Brand logo</CardTitle>
              <CardDescription>Logos are stored at their original proportions and are never cropped.</CardDescription>
            </CardHeader>
            <CardContent>
              <LogoUploadField<NationalBrand>
                brandId={brand.id}
                brandName={brand.name}
                currentLogoUrl={brand.logo_url}
                onUploaded={({ brand: updated, message, isWarning }) => {
                  setDetail((prev) => (prev ? { ...prev, brand: updated } : prev))
                  setNotice({ message, isWarning })
                }}
              />
            </CardContent>
          </Card>
          <StatusCard
            brand={brand}
            canActivate={detail.canActivate}
            onChanged={(updated, canActivate, nextNotice) => {
              setDetail((prev) => (prev ? { ...prev, brand: updated, canActivate } : prev))
              setNotice(nextNotice)
            }}
          />
        </div>
      </div>
    </div>
  )
}
