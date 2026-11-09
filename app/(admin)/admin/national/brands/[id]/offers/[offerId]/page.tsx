"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, X, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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

type RedemptionMethod = "link" | "code" | "link_and_code"
type DestinationField = "destination_url" | "voucher_code" | "tracking_reference"
type DestinationForm = Record<DestinationField, string>
type DestinationErrors = Partial<Record<DestinationField, string>>
type SavedDestination = Record<DestinationField, string | null> & { exists: boolean }

// Kept in step with the server rules in the destinations API route.
const DESTINATION_LIMITS = { destination_url: 2048, voucher_code: 100, tracking_reference: 200 }

function isRedemptionMethod(value: string | null): value is RedemptionMethod {
  return value === "link" || value === "code" || value === "link_and_code"
}

function destinationNeeds(method: RedemptionMethod) {
  return {
    url: method === "link" || method === "link_and_code",
    code: method === "code" || method === "link_and_code",
  }
}

function destinationFormFrom(saved: SavedDestination | null): DestinationForm {
  return {
    destination_url: saved?.destination_url ?? "",
    voucher_code: saved?.voucher_code ?? "",
    tracking_reference: saved?.tracking_reference ?? "",
  }
}

function isDestinationConfigured(saved: SavedDestination | null, method: string | null) {
  if (!saved?.exists || !isRedemptionMethod(method)) return false
  const needs = destinationNeeds(method)
  return (!needs.url || Boolean(saved.destination_url)) && (!needs.code || Boolean(saved.voucher_code))
}

function validateDestinationForm(form: DestinationForm, method: RedemptionMethod): DestinationErrors {
  const errors: DestinationErrors = {}
  const needs = destinationNeeds(method)

  if (needs.url) {
    const url = form.destination_url.trim()
    if (!url) errors.destination_url = "Affiliate destination URL is required for this redemption method"
    else if (url.length > DESTINATION_LIMITS.destination_url)
      errors.destination_url = `Destination URL must be ${DESTINATION_LIMITS.destination_url} characters or fewer`
    else if (/\s/.test(url)) errors.destination_url = "Destination URL must not contain spaces"
    else if (!/^https:\/\//i.test(url)) errors.destination_url = "Destination URL must start with https://"
    else {
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== "https:") errors.destination_url = "Destination URL must use HTTPS"
        else if (!parsed.hostname.includes(".")) errors.destination_url = "Destination URL must include a valid domain"
        else if (parsed.username || parsed.password)
          errors.destination_url = "Destination URL must not contain login details"
      } catch {
        errors.destination_url = "Enter a valid destination URL"
      }
    }
  }

  if (needs.code) {
    const code = form.voucher_code.trim()
    if (!code) errors.voucher_code = "Voucher or promo code is required for this redemption method"
    else if (code.length > DESTINATION_LIMITS.voucher_code)
      errors.voucher_code = `Voucher code must be ${DESTINATION_LIMITS.voucher_code} characters or fewer`
  }

  if (form.tracking_reference.trim().length > DESTINATION_LIMITS.tracking_reference)
    errors.tracking_reference = `Tracking reference must be ${DESTINATION_LIMITS.tracking_reference} characters or fewer`

  return errors
}

function RedemptionDetailsCard({
  brandId,
  offerId,
  savedMethod,
  pendingMethod,
  isArchived,
  onSaved,
}: {
  brandId: string
  offerId: string
  savedMethod: string | null
  pendingMethod: string
  isArchived: boolean
  onSaved: () => void
}) {
  const destinationsUrl = `/api/admin/national/brands/${encodeURIComponent(brandId)}/offers/${encodeURIComponent(offerId)}/destinations`

  const [saved, setSaved] = useState<SavedDestination | null>(null)
  const [form, setForm] = useState<DestinationForm>(destinationFormFrom(null))
  const [errors, setErrors] = useState<DestinationErrors>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const applySaved = (destination: SavedDestination) => {
    setSaved(destination)
    setForm(destinationFormFrom(destination))
    setErrors({})
  }

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch(destinationsUrl, { credentials: "include", cache: "no-store" })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success || !data.destination) {
        setLoadError(data?.message || "Failed to load redemption details")
        return
      }
      applySaved(data.destination as SavedDestination)
    } catch {
      setLoadError("Failed to load redemption details")
    } finally {
      setLoading(false)
    }
  }, [destinationsUrl])

  useEffect(() => {
    void load()
  }, [load])

  const method = isRedemptionMethod(savedMethod) ? savedMethod : null
  const needs = method ? destinationNeeds(method) : { url: false, code: false }
  const configured = isDestinationConfigured(saved, savedMethod)
  const methodChangePending = pendingMethod !== (savedMethod ?? "")

  const savedForm = destinationFormFrom(saved)
  const isDirty = (Object.keys(form) as DestinationField[]).some((key) => form[key] !== savedForm[key])
  const disabled = saving || isArchived || loading || !method

  const updateField = (key: DestinationField, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => {
      if (!previous[key]) return previous
      const next = { ...previous }
      delete next[key]
      return next
    })
    setSaveError(null)
  }

  const cancelEdits = () => {
    setForm(destinationFormFrom(saved))
    setErrors({})
    setSaveError(null)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!method || saving || isArchived) return
    if (!isDirty && configured) return

    const nextErrors = validateDestinationForm(form, method)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setSaveError(null)
    setNotice(null)
    try {
      const response = await fetch(destinationsUrl, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_url: needs.url ? form.destination_url : null,
          voucher_code: needs.code ? form.voucher_code : null,
          tracking_reference: form.tracking_reference,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        if (data?.errors && typeof data.errors === "object") setErrors(data.errors as DestinationErrors)
        setSaveError(
          data?.message && data.message !== "Validation failed" ? data.message : "Please correct the highlighted fields.",
        )
        return
      }
      if (data.destination) applySaved(data.destination as SavedDestination)
      if (data.changed !== false) onSaved()
      setNotice({ tone: data.partial ? "warning" : "success", message: data.message || "Redemption details saved." })
    } catch {
      setSaveError("Failed to save redemption details. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const errorProps = (key: DestinationField, extraDescribedBy?: string) => {
    const describedBy = [errors[key] ? `redemption-${key}-error` : null, extraDescribedBy].filter(Boolean).join(" ")
    return {
      "aria-invalid": errors[key] ? (true as const) : undefined,
      "aria-describedby": describedBy || undefined,
    }
  }

  const fieldError = (key: DestinationField) =>
    errors[key] ? (
      <p id={`redemption-${key}-error`} className="text-xs text-red-600">
        {errors[key]}
      </p>
    ) : null

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-red-700">Redemption details</CardTitle>
          {loading ? null : (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                configured ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700",
              )}
            >
              {configured ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {configured ? "Configured" : "Not configured"}
            </span>
          )}
        </div>
        <CardDescription>
          Private to admins. These details are never shown on the offer card or returned by the general offer API.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-gray-500" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading redemption details…
          </div>
        ) : loadError ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {loadError}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} className="bg-white">
              Try again
            </Button>
          </div>
        ) : (
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
                This offer is archived, so its redemption details cannot be changed.
              </p>
            ) : null}

            {!method ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Choose and save a redemption method in Offer details before adding redemption details.
              </p>
            ) : methodChangePending ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                You have an unsaved redemption method change. Save Offer details first; these fields follow the saved
                method.
              </p>
            ) : null}

            {saveError ? (
              <p role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {saveError}
              </p>
            ) : null}

            {needs.url ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="redemption-destination-url">Affiliate destination URL</Label>
                <Input
                  id="redemption-destination-url"
                  type="url"
                  inputMode="url"
                  value={form.destination_url}
                  onChange={(event) => updateField("destination_url", event.target.value)}
                  maxLength={DESTINATION_LIMITS.destination_url}
                  placeholder="https://"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={disabled}
                  required
                  {...errorProps("destination_url", "redemption-destination-url-help")}
                />
                <p id="redemption-destination-url-help" className="text-xs text-gray-500">
                  Must be a full HTTPS address.
                </p>
                {fieldError("destination_url")}
              </div>
            ) : null}

            {needs.code ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="redemption-voucher-code">Voucher or promo code</Label>
                <Input
                  id="redemption-voucher-code"
                  value={form.voucher_code}
                  onChange={(event) => updateField("voucher_code", event.target.value)}
                  maxLength={DESTINATION_LIMITS.voucher_code}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={disabled}
                  required
                  className="font-mono"
                  {...errorProps("voucher_code")}
                />
                {fieldError("voucher_code")}
              </div>
            ) : null}

            {method ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="redemption-tracking-reference">
                  Tracking reference <span className="font-normal text-gray-500">(optional)</span>
                </Label>
                <Input
                  id="redemption-tracking-reference"
                  value={form.tracking_reference}
                  onChange={(event) => updateField("tracking_reference", event.target.value)}
                  maxLength={DESTINATION_LIMITS.tracking_reference}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={disabled}
                  {...errorProps("tracking_reference")}
                />
                {fieldError("tracking_reference")}
              </div>
            ) : null}

            {method ? (
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
                  disabled={disabled || (!isDirty && configured)}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {saving ? "Saving…" : "Save Redemption Details"}
                </Button>
              </div>
            ) : null}
          </form>
        )}
      </CardContent>
    </Card>
  )
}

type ReadinessCheck = { key: string; label: string; ok: boolean; reason: string | null }
type Readiness = { ready: boolean; checks: ReadinessCheck[] }
type PublicationAction = "publish" | "pause" | "draft"
type ScheduleLabel = "Scheduled" | "Live" | "Expired"

// Calculated for display only; publication_status itself stays "published".
function scheduleLabel(status: string, startsAt: string | null, endsAt: string | null, now = Date.now()): ScheduleLabel | null {
  if (status !== "published") return null
  const start = startsAt ? new Date(startsAt).getTime() : NaN
  const end = endsAt ? new Date(endsAt).getTime() : NaN
  if (!isNaN(end) && end <= now) return "Expired"
  if (!isNaN(start) && start > now) return "Scheduled"
  return "Live"
}

const SCHEDULE_STYLES: Record<ScheduleLabel, string> = {
  Scheduled: "bg-blue-100 text-blue-800",
  Live: "bg-green-100 text-green-800",
  Expired: "bg-red-100 text-red-800",
}

const ACTION_COPY: Record<PublicationAction, { button: string; title: string; description: string; confirm: string }> = {
  publish: {
    button: "Publish Offer",
    title: "Publish this offer?",
    description:
      "The offer's admin status will change to Published. Its start and expiry dates will not be changed. Customers cannot see national offers yet, because the public listing has not been built.",
    confirm: "Publish Offer",
  },
  pause: {
    button: "Pause Offer",
    title: "Pause this offer?",
    description: "The offer's admin status will change to Paused. You can publish it again later.",
    confirm: "Pause Offer",
  },
  draft: {
    button: "Unpublish to Draft",
    title: "Move this offer to draft?",
    description: "The offer's admin status will change to Draft. You can publish it again once it is ready.",
    confirm: "Move to Draft",
  },
}

function PublicationCard({
  brandId,
  offerId,
  status,
  startsAt,
  endsAt,
  refreshKey,
  hasUnsavedChanges,
  onChanged,
}: {
  brandId: string
  offerId: string
  status: string
  startsAt: string | null
  endsAt: string | null
  refreshKey: number
  hasUnsavedChanges: boolean
  onChanged: (offer: EditorOffer) => void
}) {
  const publicationUrl = `/api/admin/national/brands/${encodeURIComponent(brandId)}/offers/${encodeURIComponent(offerId)}/publication`

  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pending, setPending] = useState<PublicationAction | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch(publicationUrl, { credentials: "include", cache: "no-store" })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success || !data.readiness) {
        setLoadError(data?.message || "Failed to load publication readiness")
        return
      }
      setReadiness(data.readiness as Readiness)
    } catch {
      setLoadError("Failed to load publication readiness")
    } finally {
      setLoading(false)
    }
  }, [publicationUrl])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const isArchived = status === "archived"
  const label = scheduleLabel(status, startsAt, endsAt)
  const actions: PublicationAction[] =
    status === "published" ? ["pause", "draft"] : status === "paused" ? ["publish", "draft"] : status === "draft" ? ["publish"] : []
  const publishBlocked = !readiness?.ready || hasUnsavedChanges

  const runAction = async () => {
    if (!pending || submitting) return
    setSubmitting(true)
    setActionError(null)
    setNotice(null)
    try {
      const response = await fetch(publicationUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: pending }),
      })
      const data = await response.json().catch(() => null)
      if (data?.readiness) setReadiness(data.readiness as Readiness)
      if (!response.ok || !data?.success) {
        setActionError(data?.message || "Failed to change publication status.")
        setPending(null)
        return
      }
      if (data.offer) onChanged(data.offer as EditorOffer)
      setNotice({ tone: data.partial ? "warning" : "success", message: data.message || "Publication status updated." })
      setPending(null)
    } catch {
      setActionError("Failed to change publication status. Please try again.")
      setPending(null)
    } finally {
      setSubmitting(false)
    }
  }

  const copy = pending ? ACTION_COPY[pending] : null
  const draftLabel = status === "paused" ? "Move to Draft" : ACTION_COPY.draft.button

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-red-700">Publication</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
            >
              {status}
            </span>
            {label ? (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SCHEDULE_STYLES[label]}`}>{label}</span>
            ) : null}
          </div>
        </div>
        <CardDescription>
          This is the admin publication status only. Customers cannot see national offers yet, because the public
          listing and redemption journey have not been built.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {notice ? (
          <div
            role="status"
            className={cn(
              "flex items-start gap-2 rounded-md border p-3 text-sm",
              notice.tone === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800",
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

        {actionError ? (
          <p role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {actionError}
          </p>
        ) : null}

        {label === "Expired" ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            This offer&apos;s expiry date has passed. It stays Published in admin until you change it.
          </p>
        ) : null}

        {loading && !readiness ? (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-500" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Checking publication readiness…
          </div>
        ) : loadError ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {loadError}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} className="bg-white">
              Try again
            </Button>
          </div>
        ) : readiness ? (
          <section aria-labelledby="publication-checklist-heading" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 id="publication-checklist-heading" className="text-sm font-semibold text-gray-900">
                Readiness checklist
              </h3>
              <span className={cn("text-xs font-medium", readiness.ready ? "text-green-700" : "text-gray-600")}>
                {readiness.ready
                  ? "Ready to publish"
                  : `${readiness.checks.filter((check) => !check.ok).length} item(s) need attention`}
              </span>
            </div>
            <ul className="flex flex-col divide-y divide-gray-100 rounded-md border border-gray-200">
              {readiness.checks.map((check) => (
                <li key={check.key} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                  {check.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                  )}
                  <div className="flex flex-col">
                    <span className={check.ok ? "text-gray-800" : "font-medium text-gray-900"}>
                      <span className="sr-only">{check.ok ? "Done: " : "Missing: "}</span>
                      {check.label}
                    </span>
                    {check.reason ? <span className="text-xs text-red-700">{check.reason}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {isArchived ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            This offer is archived and locked. Its publication status cannot be changed.
          </p>
        ) : null}

        {actions.includes("publish") && hasUnsavedChanges ? (
          <p className="text-xs text-gray-600">Save your Offer details changes before publishing.</p>
        ) : null}

        {actions.length > 0 ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {actions.includes("draft") ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setPending("draft")}
                disabled={submitting}
                className="bg-transparent"
              >
                {draftLabel}
              </Button>
            ) : null}
            {actions.includes("pause") ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setPending("pause")}
                disabled={submitting}
                className="bg-transparent"
              >
                {ACTION_COPY.pause.button}
              </Button>
            ) : null}
            {actions.includes("publish") ? (
              <Button
                type="button"
                onClick={() => setPending("publish")}
                disabled={submitting || loading || publishBlocked}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {ACTION_COPY.publish.button}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && !submitting && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              onClick={() => void runAction()}
              disabled={submitting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {submitting ? "Working…" : pending === "draft" ? "Move to Draft" : copy?.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
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
  const [readinessKey, setReadinessKey] = useState(0)
  const refreshReadiness = useCallback(() => setReadinessKey((key) => key + 1), [])

  const onImageSaved = useCallback(
    (saved: EditorOffer) => {
      setOffer(saved)
      refreshReadiness()
    },
    [refreshReadiness],
  )

  // Only the stored status changed, so unsaved form edits are kept.
  const onPublicationChanged = useCallback((updated: EditorOffer) => setOffer(updated), [])

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
      if (data.changed !== false) refreshReadiness()
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
  const scheduleLabelForHeader = scheduleLabel(status, offer.starts_at, offer.ends_at)

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
          {scheduleLabelForHeader ? (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SCHEDULE_STYLES[scheduleLabelForHeader]}`}>
              {scheduleLabelForHeader}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-gray-500">
          Publication status is administrative only. National offers are not shown to customers yet.
        </p>
      </header>

      {/* Constrains the uploader's saved/current image preview without altering the uploader or the stored image. */}
      <div className="[&_form_.aspect-video.rounded-md]:max-w-sm">
        <OfferImageUploader offer={previewOffer} brand={brand} onSaved={onImageSaved} />
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

      <RedemptionDetailsCard
        brandId={brandId}
        offerId={offerId}
        savedMethod={offer.redemption_method}
        pendingMethod={form.redemption_method}
        isArchived={isArchived}
        onSaved={refreshReadiness}
      />

      <PublicationCard
        brandId={brandId}
        offerId={offerId}
        status={status}
        startsAt={offer.starts_at}
        endsAt={offer.ends_at}
        refreshKey={readinessKey}
        hasUnsavedChanges={isDirty}
        onChanged={onPublicationChanged}
      />
    </div>
  )
}
