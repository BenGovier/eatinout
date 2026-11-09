"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
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

const REDEMPTION_OPTIONS = [
  { value: "link", label: "Link" },
  { value: "code", label: "Code" },
  { value: "link_and_code", label: "Link + Code" },
]

// Kept in step with the server rules in the offer API routes.
const LIMITS = { title: 160, deal_label: 40, description: 2000, terms: 5000 }

type DetailsForm = {
  title: string
  deal_label: string
  description: string
  terms: string
  starts_at: string
  ends_at: string
  redemption_method: string
}

type FieldErrors = Partial<Record<keyof DetailsForm, string>>
type Notice = { tone: "success" | "warning"; message: string }

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? ""
}

// <input type="datetime-local"> works in the admin's local time zone without seconds.
function toLocalInput(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function localInputToIso(value: string) {
  if (!value) return null
  const date = new Date(value)
  return isNaN(date.getTime()) ? null : date.toISOString()
}

function formFromOffer(offer: EditorOffer): DetailsForm {
  return {
    title: offer.title ?? "",
    deal_label: offer.deal_label ?? "",
    description: offer.description ?? "",
    terms: offer.terms ?? "",
    starts_at: toLocalInput(offer.starts_at),
    ends_at: toLocalInput(offer.ends_at),
    redemption_method: offer.redemption_method ?? "",
  }
}

function validateForm(form: DetailsForm): FieldErrors {
  const errors: FieldErrors = {}
  const title = form.title.trim()
  if (!title) errors.title = "Offer title is required"
  else if (title.length > LIMITS.title) errors.title = `Offer title must be ${LIMITS.title} characters or fewer`
  else if (!/[a-z0-9]/i.test(title)) errors.title = "Offer title must contain letters or numbers"

  if (form.deal_label.trim().length > LIMITS.deal_label)
    errors.deal_label = `Deal label must be ${LIMITS.deal_label} characters or fewer`
  if (form.description.trim().length > LIMITS.description)
    errors.description = `Description must be ${LIMITS.description} characters or fewer`
  if (form.terms.trim().length > LIMITS.terms) errors.terms = `Terms must be ${LIMITS.terms} characters or fewer`

  if (!REDEMPTION_OPTIONS.some((option) => option.value === form.redemption_method))
    errors.redemption_method = "Choose Link, Code, or Link + Code"

  const startsAt = localInputToIso(form.starts_at)
  if (!startsAt) errors.starts_at = "Enter a valid start date and time"
  if (form.ends_at) {
    const endsAt = localInputToIso(form.ends_at)
    if (!endsAt) errors.ends_at = "Enter a valid expiry date and time"
    else if (startsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime())
      errors.ends_at = "Expiry must be later than the start date"
  }
  return errors
}

export default function AdminNationalOfferEditorPage() {
  const params = useParams<{ id: string; offerId: string }>()
  const brandId = single(params.id)
  const offerId = single(params.offerId)

  const [brand, setBrand] = useState<EditorBrand | null>(null)
  const [offer, setOffer] = useState<EditorOffer | null>(null)
  const [form, setForm] = useState<DetailsForm | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null)

  const offerUrl = `/api/admin/national/brands/${encodeURIComponent(brandId)}/offers/${encodeURIComponent(offerId)}`

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(offerUrl, { credentials: "include", cache: "no-store" })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        setError({ message: data?.message || "Failed to load offer", notFound: response.status === 404 })
        return
      }
      setBrand(data.brand)
      setOffer(data.offer)
      setForm(formFromOffer(data.offer))
      setFieldErrors({})
    } catch {
      setError({ message: "Failed to load offer", notFound: false })
    } finally {
      setLoading(false)
    }
  }, [offerUrl])

  useEffect(() => {
    void load()
  }, [load])

  const savedForm = useMemo(() => (offer ? formFromOffer(offer) : null), [offer])
  const isDirty = useMemo(() => {
    if (!form || !savedForm) return false
    return (Object.keys(form) as (keyof DetailsForm)[]).some((key) => form[key] !== savedForm[key])
  }, [form, savedForm])

  // Unsaved edits drive the mobile card preview; the stored offer is left untouched.
  const previewOffer = useMemo<EditorOffer | null>(() => {
    if (!offer || !form) return offer
    return {
      ...offer,
      title: form.title.trim() || offer.title,
      deal_label: form.deal_label.trim() || null,
      description: form.description.trim() || null,
      terms: form.terms.trim() || null,
      ends_at: localInputToIso(form.ends_at),
      redemption_method: form.redemption_method || null,
    }
  }, [offer, form])

  const updateField = (key: keyof DetailsForm, value: string) => {
    setForm((previous) => (previous ? { ...previous, [key]: value } : previous))
    setFieldErrors((previous) => {
      if (!previous[key]) return previous
      const next = { ...previous }
      delete next[key]
      return next
    })
    setSaveError(null)
  }

  const cancelEdits = () => {
    if (!offer) return
    setForm(formFromOffer(offer))
    setFieldErrors({})
    setSaveError(null)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form || !offer || !savedForm || !isDirty || saving) return

    const errors = validateForm(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    setSaveError(null)
    setNotice(null)
    try {
      const response = await fetch(offerUrl, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          deal_label: form.deal_label,
          description: form.description,
          terms: form.terms,
          // Untouched dates keep their stored value; the input cannot represent seconds.
          starts_at: form.starts_at === savedForm.starts_at ? offer.starts_at : localInputToIso(form.starts_at),
          ends_at: form.ends_at === savedForm.ends_at ? offer.ends_at : localInputToIso(form.ends_at),
          redemption_method: form.redemption_method,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        if (data?.errors && typeof data.errors === "object") setFieldErrors(data.errors as FieldErrors)
        setSaveError(data?.message && data.message !== "Validation failed" ? data.message : "Please correct the highlighted fields.")
        return
      }
      if (data.offer) {
        setOffer(data.offer as EditorOffer)
        setForm(formFromOffer(data.offer as EditorOffer))
      }
      setNotice({ tone: data.partial ? "warning" : "success", message: data.message || "Offer details saved." })
    } catch {
      setSaveError("Failed to save offer details. Please try again.")
    } finally {
      setSaving(false)
    }
  }

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

  if (error || !brand || !offer || !form || !previewOffer) {
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
  const isArchived = status === "archived"
  const disabled = saving || isArchived

  const errorProps = (key: keyof DetailsForm) =>
    fieldErrors[key]
      ? { "aria-invalid": true as const, "aria-describedby": `offer-${key}-error` }
      : {}

  const fieldError = (key: keyof DetailsForm) =>
    fieldErrors[key] ? (
      <p id={`offer-${key}-error`} className="text-xs text-red-600">
        {fieldErrors[key]}
      </p>
    ) : null

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

      {/* Constrains the uploader's saved/current image preview without altering the uploader or the stored image. */}
      <div className="[&_form_.aspect-video.rounded-md]:max-w-sm">
        <OfferImageUploader offer={previewOffer} brand={brand} onSaved={setOffer} />
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-red-700">Offer details</CardTitle>
          <CardDescription>Changes appear in the mobile card preview straight away and are stored when saved.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            {notice ? (
              <div
                role="status"
                className={cn(
                  "flex items-start gap-2 rounded-md border p-3 text-sm",
                  notice.tone === "success"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-amber-200 bg-amber-50 text-amber-800",
                )}
              >
                {notice.tone === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <p className="flex-1">{notice.message}</p>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="rounded p-0.5 hover:bg-black/5"
                  aria-label="Dismiss message"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}

            {isArchived ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                This offer is archived, so its details cannot be changed.
              </p>
            ) : null}

            {saveError ? (
              <p role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {saveError}
              </p>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="offer-title">Offer title</Label>
              <Input
                id="offer-title"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                maxLength={LIMITS.title}
                disabled={disabled}
                required
                {...errorProps("title")}
              />
              {fieldError("title")}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="offer-deal-label">
                  Deal label <span className="font-normal text-gray-500">(optional)</span>
                </Label>
                <Input
                  id="offer-deal-label"
                  value={form.deal_label}
                  onChange={(event) => updateField("deal_label", event.target.value)}
                  maxLength={LIMITS.deal_label}
                  placeholder="e.g. 20% off"
                  disabled={disabled}
                  {...errorProps("deal_label")}
                />
                {fieldError("deal_label")}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="offer-redemption">Redemption method</Label>
                <select
                  id="offer-redemption"
                  value={form.redemption_method}
                  onChange={(event) => updateField("redemption_method", event.target.value)}
                  disabled={disabled}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...errorProps("redemption_method")}
                >
                  {form.redemption_method === "" ? <option value="">Choose a method</option> : null}
                  {REDEMPTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldError("redemption_method")}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="offer-starts-at">Start date and time</Label>
                <Input
                  id="offer-starts-at"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(event) => updateField("starts_at", event.target.value)}
                  disabled={disabled}
                  required
                  {...errorProps("starts_at")}
                />
                {fieldError("starts_at")}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="offer-ends-at">
                  Expiry date and time <span className="font-normal text-gray-500">(optional)</span>
                </Label>
                <Input
                  id="offer-ends-at"
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(event) => updateField("ends_at", event.target.value)}
                  disabled={disabled}
                  {...errorProps("ends_at")}
                />
                {fieldError("ends_at")}
              </div>
            </div>
            <p className="-mt-3 text-xs text-gray-500">Times use this device&apos;s time zone. Leave expiry empty for no end date.</p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="offer-description">
                Description <span className="font-normal text-gray-500">(optional)</span>
              </Label>
              <Textarea
                id="offer-description"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                maxLength={LIMITS.description}
                rows={4}
                disabled={disabled}
                {...errorProps("description")}
              />
              {fieldError("description")}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="offer-terms">
                Terms and conditions <span className="font-normal text-gray-500">(optional)</span>
              </Label>
              <Textarea
                id="offer-terms"
                value={form.terms}
                onChange={(event) => updateField("terms", event.target.value)}
                maxLength={LIMITS.terms}
                rows={5}
                disabled={disabled}
                aria-describedby={fieldErrors.terms ? "offer-terms-error offer-terms-help" : "offer-terms-help"}
                aria-invalid={fieldErrors.terms ? true : undefined}
              />
              <p id="offer-terms-help" className="text-xs text-gray-500">
                Put each term on its own line.
              </p>
              {fieldError("terms")}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={cancelEdits}
                disabled={!isDirty || saving}
                className="bg-transparent"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isDirty || disabled}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
