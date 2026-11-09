"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Loader2, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type BrandSummary = { id: string; name: string; status: string; logo_url: string | null }

type FormValues = {
  title: string
  deal_label: string
  description: string
  terms: string
  starts_at: string
  ends_at: string
  redemption_method: string
}

type FieldErrors = Partial<Record<keyof FormValues | "form", string>>

const REDEMPTION_OPTIONS = [
  { value: "link", label: "Link" },
  { value: "code", label: "Code" },
  { value: "link_and_code", label: "Link + Code" },
] as const

const LIMITS = { title: 160, deal_label: 40, description: 2000, terms: 5000 }

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function initialValues(): FormValues {
  return {
    title: "",
    deal_label: "",
    description: "",
    terms: "",
    starts_at: toLocalInputValue(new Date()),
    ends_at: "",
    redemption_method: "link",
  }
}

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {}
  const title = values.title.trim()
  if (!title) errors.title = "Offer title is required"
  else if (title.length > LIMITS.title) errors.title = `Offer title must be ${LIMITS.title} characters or fewer`
  else if (!/[a-z0-9]/i.test(title)) errors.title = "Offer title must contain letters or numbers"
  if (values.deal_label.trim().length > LIMITS.deal_label)
    errors.deal_label = `Deal label must be ${LIMITS.deal_label} characters or fewer`
  if (values.description.trim().length > LIMITS.description)
    errors.description = `Description must be ${LIMITS.description} characters or fewer`
  if (values.terms.trim().length > LIMITS.terms) errors.terms = `Terms must be ${LIMITS.terms} characters or fewer`

  const start = values.starts_at ? new Date(values.starts_at) : null
  if (!start || isNaN(start.getTime())) errors.starts_at = "Enter a valid start date and time"
  if (values.ends_at) {
    const end = new Date(values.ends_at)
    if (isNaN(end.getTime())) errors.ends_at = "Enter a valid expiry date and time"
    else if (start && !isNaN(start.getTime()) && end.getTime() <= start.getTime())
      errors.ends_at = "Expiry must be later than the start date"
  }
  if (!REDEMPTION_OPTIONS.some((option) => option.value === values.redemption_method))
    errors.redemption_method = "Choose a redemption method"
  return errors
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-sm text-red-600">
      {message}
    </p>
  )
}

function BackToBrand({ brandId }: { brandId: string }) {
  return (
    <Link
      href={`/admin/national/brands/${encodeURIComponent(brandId)}`}
      className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-red-700"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to brand
    </Link>
  )
}

export default function NewNationalOfferPage() {
  const params = useParams<{ id: string }>()
  const brandId = params?.id ?? ""
  const router = useRouter()

  const [brand, setBrand] = useState<BrandSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [notFound, setNotFound] = useState(false)

  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)

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
        if (!response.ok || !data?.success) throw new Error(data?.message || "Failed to fetch brand")
        setBrand({ id: data.brand.id, name: data.brand.name, status: data.brand.status, logo_url: data.brand.logo_url })
      } catch (err) {
        if (controller.signal.aborted) return
        setLoadError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadBrand()
    return () => controller.abort()
  }, [brandId])

  useEffect(() => {
    if (brand?.name) document.title = `New offer · ${brand.name}`
  }, [brand?.name])

  function update(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving || !brand) return

    const clientErrors = validate(values)
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setIsSaving(true)
    setErrors({})
    try {
      const response = await fetch(`/api/admin/national/brands/${encodeURIComponent(brand.id)}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          title: values.title.trim(),
          deal_label: values.deal_label.trim() || null,
          description: values.description.trim() || null,
          terms: values.terms.trim() || null,
          starts_at: new Date(values.starts_at).toISOString(),
          ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : null,
          redemption_method: values.redemption_method,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        setErrors({ ...(data?.errors ?? {}), form: data?.message || "Failed to create offer" })
        setIsSaving(false)
        return
      }
      const query = new URLSearchParams({ offerCreated: String(data.offer.id) })
      if (data.partial) query.set("audit", "failed")
      router.push(`/admin/national/brands/${encodeURIComponent(brand.id)}?${query.toString()}`)
    } catch {
      setErrors({ form: "Network error. Please try again." })
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse max-w-3xl" role="status" aria-label="Loading brand">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-8 w-1/2 bg-gray-200 rounded" />
        <div className="h-96 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  if (notFound || loadError || !brand) {
    return (
      <div className="space-y-4 max-w-3xl">
        <BackToBrand brandId={brandId} />
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            <h1 className="font-bold">{notFound ? "Brand not found" : "Error"}</h1>
          </div>
          <p className="text-sm mt-1">
            {notFound ? "It may have been removed or the link is incorrect." : loadError || "Failed to fetch brand"}
          </p>
        </div>
      </div>
    )
  }

  const isArchived = brand.status === "archived"
  const disabled = isSaving || isArchived

  return (
    <div className="space-y-6 max-w-3xl">
      <BackToBrand brandId={brand.id} />

      <header className="flex items-center gap-4">
        {brand.logo_url ? (
          // Plain img avoids requiring next/image remotePatterns for arbitrary brand logo hosts
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logo_url}
            alt={`${brand.name} logo`}
            className="h-14 w-14 rounded-lg object-contain bg-white border flex-shrink-0"
          />
        ) : (
          <div
            className="h-14 w-14 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            <Store className="h-6 w-6 text-gray-500" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-gray-500">New national offer for</p>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 break-words">{brand.name}</h1>
        </div>
      </header>

      {isArchived && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md text-sm flex gap-2" role="alert">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>This brand is archived. Restore it to draft before adding offers.</span>
        </div>
      )}

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-red-700">Offer details</CardTitle>
          <CardDescription>
            Offers are saved as drafts and are not visible to members. Images, links and codes are added later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {errors.form && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm flex gap-2" role="alert">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{errors.form}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="offer-title">
                  Offer title <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="offer-title"
                  value={values.title}
                  onChange={(e) => update("title", e.target.value)}
                  maxLength={LIMITS.title}
                  required
                  disabled={disabled}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? "offer-title-error" : undefined}
                />
                <FieldError id="offer-title-error" message={errors.title} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="offer-deal-label">Deal label</Label>
                <Input
                  id="offer-deal-label"
                  placeholder="e.g. 25% OFF"
                  value={values.deal_label}
                  onChange={(e) => update("deal_label", e.target.value)}
                  maxLength={LIMITS.deal_label}
                  disabled={disabled}
                  aria-invalid={Boolean(errors.deal_label)}
                  aria-describedby={errors.deal_label ? "offer-deal-label-error" : undefined}
                />
                <FieldError id="offer-deal-label-error" message={errors.deal_label} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offer-description">Description</Label>
              <Textarea
                id="offer-description"
                rows={4}
                value={values.description}
                onChange={(e) => update("description", e.target.value)}
                maxLength={LIMITS.description}
                disabled={disabled}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? "offer-description-error" : undefined}
              />
              <FieldError id="offer-description-error" message={errors.description} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offer-terms">Terms and conditions</Label>
              <Textarea
                id="offer-terms"
                rows={5}
                value={values.terms}
                onChange={(e) => update("terms", e.target.value)}
                maxLength={LIMITS.terms}
                disabled={disabled}
                aria-invalid={Boolean(errors.terms)}
                aria-describedby={errors.terms ? "offer-terms-error" : undefined}
              />
              <FieldError id="offer-terms-error" message={errors.terms} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="offer-starts-at">
                  Starts <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="offer-starts-at"
                  type="datetime-local"
                  value={values.starts_at}
                  onChange={(e) => update("starts_at", e.target.value)}
                  required
                  disabled={disabled}
                  aria-invalid={Boolean(errors.starts_at)}
                  aria-describedby={errors.starts_at ? "offer-starts-at-error" : undefined}
                />
                <FieldError id="offer-starts-at-error" message={errors.starts_at} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="offer-ends-at">Expires (optional)</Label>
                <Input
                  id="offer-ends-at"
                  type="datetime-local"
                  value={values.ends_at}
                  min={values.starts_at || undefined}
                  onChange={(e) => update("ends_at", e.target.value)}
                  disabled={disabled}
                  aria-invalid={Boolean(errors.ends_at)}
                  aria-describedby={errors.ends_at ? "offer-ends-at-error" : undefined}
                />
                <FieldError id="offer-ends-at-error" message={errors.ends_at} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="offer-redemption">
                  Redemption method <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={values.redemption_method}
                  onValueChange={(value) => update("redemption_method", value)}
                  disabled={disabled}
                >
                  <SelectTrigger
                    id="offer-redemption"
                    aria-invalid={Boolean(errors.redemption_method)}
                    aria-describedby={errors.redemption_method ? "offer-redemption-error" : undefined}
                  >
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {REDEMPTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError id="offer-redemption-error" message={errors.redemption_method} />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Times use your local timezone. Affiliate links and voucher codes are managed separately.
            </p>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button asChild variant="outline" disabled={isSaving}>
                <Link
                  href={`/admin/national/brands/${encodeURIComponent(brand.id)}`}
                  aria-disabled={isSaving}
                  tabIndex={isSaving ? -1 : undefined}
                  className={isSaving ? "pointer-events-none opacity-50" : undefined}
                >
                  Cancel
                </Link>
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white" disabled={disabled}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  "Save draft"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
