"use client"

import { useEffect, useState, type FormEvent } from "react"
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Plus, Store, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

const STATUS_STYLES: Record<BrandStatus, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  draft: "bg-gray-50 text-gray-700 border-gray-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-red-50 text-red-700 border-red-200",
}

function formatDate(value: string) {
  const date = new Date(value)
  if (isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })
}

function StatusBadge({ status }: { status: BrandStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft
  return (
    <span className={`inline-block border px-2 py-0.5 rounded-full text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  )
}

function BrandLogo({ brand, size }: { brand: NationalBrand; size: "sm" | "md" }) {
  const dimensions = size === "sm" ? "h-10 w-10" : "h-14 w-14"
  if (!brand.logo_url) {
    return (
      <div
        className={`${dimensions} rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0`}
        aria-hidden="true"
      >
        <Store className="h-5 w-5 text-gray-500" />
      </div>
    )
  }
  return (
    // Plain img avoids requiring next/image remotePatterns for arbitrary brand logo hosts
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brand.logo_url}
      alt={`${brand.name} logo`}
      className={`${dimensions} rounded-md object-contain bg-white border flex-shrink-0`}
      loading="lazy"
    />
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading national brands" role="status">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="flex items-center gap-3 animate-pulse">
          <div className="h-10 w-10 bg-gray-200 rounded-md" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
      <p className="text-gray-500">No national brands added yet.</p>
    </div>
  )
}

const AFFILIATE_NETWORKS = ["CJ", "Impact", "Direct", "Other"] as const
const NO_NETWORK = "none"

type BrandFormValues = {
  name: string
  description: string
  website_url: string
  affiliate_network: string
  logo_url: string
}

type FieldErrors = Partial<Record<keyof BrandFormValues | "form", string>>

const EMPTY_FORM: BrandFormValues = {
  name: "",
  description: "",
  website_url: "",
  affiliate_network: NO_NETWORK,
  logo_url: "",
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

function validateForm(values: BrandFormValues): FieldErrors {
  const errors: FieldErrors = {}
  const name = values.name.trim()
  if (!name) errors.name = "Brand name is required"
  else if (name.length > 120) errors.name = "Brand name must be 120 characters or fewer"
  else if (!/[a-z0-9]/i.test(name)) errors.name = "Brand name must contain letters or numbers"
  if (values.description.trim().length > 2000) errors.description = "Description must be 2000 characters or fewer"
  if (values.website_url.trim() && !isValidHttpUrl(values.website_url.trim()))
    errors.website_url = "Enter a full URL, e.g. https://example.com"
  if (values.logo_url.trim() && !isValidHttpUrl(values.logo_url.trim()))
    errors.logo_url = "Enter a full URL, e.g. https://example.com/logo.png"
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

function AddBrandDialog({ onCreated }: { onCreated: (message: string, isWarning: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<BrandFormValues>(EMPTY_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  function handleOpenChange(next: boolean) {
    if (isSaving) return
    setOpen(next)
    if (!next) {
      setValues(EMPTY_FORM)
      setErrors({})
    }
  }

  function update(field: keyof BrandFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return

    const clientErrors = validateForm(values)
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setIsSaving(true)
    setErrors({})
    try {
      const response = await fetch("/api/admin/national/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          name: values.name.trim(),
          description: values.description.trim() || null,
          website_url: values.website_url.trim() || null,
          logo_url: values.logo_url.trim() || null,
          affiliate_network: values.affiliate_network === NO_NETWORK ? null : values.affiliate_network,
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.success) {
        setErrors({ ...(data?.errors ?? {}), form: data?.message || "Failed to create brand" })
        return
      }

      setOpen(false)
      setValues(EMPTY_FORM)
      if (data.partial) {
        onCreated(data.message || `Brand created (ID: ${data.brand?.id}), but the audit log failed.`, true)
      } else {
        onCreated(`"${data.brand?.name ?? values.name.trim()}" created as a draft.`, false)
      }
    } catch {
      setErrors({ form: "Network error. Please try again." })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700 text-white">
          <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
          Add Brand
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-red-700">Add National Brand</DialogTitle>
          <DialogDescription>New brands are created as drafts and are not visible to members.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm flex gap-2" role="alert">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{errors.form}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="brand-name">
              Brand name <span className="text-red-600">*</span>
            </Label>
            <Input
              id="brand-name"
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              maxLength={120}
              required
              disabled={isSaving}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "brand-name-error" : undefined}
            />
            <FieldError id="brand-name-error" message={errors.name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-description">Description</Label>
            <Textarea
              id="brand-description"
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              maxLength={2000}
              rows={3}
              disabled={isSaving}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "brand-description-error" : undefined}
            />
            <FieldError id="brand-description-error" message={errors.description} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="brand-website">Website URL</Label>
              <Input
                id="brand-website"
                type="url"
                inputMode="url"
                placeholder="https://example.com"
                value={values.website_url}
                onChange={(e) => update("website_url", e.target.value)}
                disabled={isSaving}
                aria-invalid={Boolean(errors.website_url)}
                aria-describedby={errors.website_url ? "brand-website-error" : undefined}
              />
              <FieldError id="brand-website-error" message={errors.website_url} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="brand-network">Affiliate network</Label>
              <Select
                value={values.affiliate_network}
                onValueChange={(value) => update("affiliate_network", value)}
                disabled={isSaving}
              >
                <SelectTrigger
                  id="brand-network"
                  aria-invalid={Boolean(errors.affiliate_network)}
                  aria-describedby={errors.affiliate_network ? "brand-network-error" : undefined}
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
              <FieldError id="brand-network-error" message={errors.affiliate_network} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-logo">Logo URL</Label>
            <Input
              id="brand-logo"
              type="url"
              inputMode="url"
              placeholder="https://example.com/logo.png"
              value={values.logo_url}
              onChange={(e) => update("logo_url", e.target.value)}
              disabled={isSaving}
              aria-invalid={Boolean(errors.logo_url)}
              aria-describedby={errors.logo_url ? "brand-logo-error" : undefined}
            />
            <FieldError id="brand-logo-error" message={errors.logo_url} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Create Brand"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminNationalBrandsPage() {
  const [brands, setBrands] = useState<NationalBrand[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [notice, setNotice] = useState<{ message: string; isWarning: boolean } | null>(null)

  useEffect(() => {
    document.title = "National Brands"
    const controller = new AbortController()

    async function loadBrands() {
      try {
        const response = await fetch("/api/admin/national/brands", {
          cache: "no-store",
          signal: controller.signal,
        })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Failed to fetch national brands")
        }
        setBrands(data.brands)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadBrands()
    return () => controller.abort()
  }, [refreshKey])

  function handleCreated(message: string, isWarning: boolean) {
    setNotice({ message, isWarning })
    setRefreshKey((key) => key + 1)
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mt-4" role="alert">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" aria-hidden="true" />
          <h2 className="font-bold">Error</h2>
        </div>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">National Brands</h1>
        <div className="flex items-center gap-3">
          {!isLoading && (
            <div className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
              {brands.length} {brands.length === 1 ? "brand" : "brands"}
            </div>
          )}
          <AddBrandDialog onCreated={handleCreated} />
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={`border p-3 rounded-md text-sm flex items-start gap-2 ${
            notice.isWarning
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-green-50 border-green-200 text-green-800"
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
            onClick={() => setNotice(null)}
            className="flex-shrink-0 rounded hover:opacity-70"
            aria-label="Dismiss message"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-red-700">All National Brands</CardTitle>
          <CardDescription>Brands available for national offers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton />
          ) : brands.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand</TableHead>
                      <TableHead>Affiliate Network</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brands.map((brand) => (
                      <TableRow key={brand.id} className="hover:bg-red-50/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <BrandLogo brand={brand} size="sm" />
                            <span className="font-medium text-gray-900">{brand.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700">{brand.affiliate_network || "—"}</TableCell>
                        <TableCell>
                          <StatusBadge status={brand.status} />
                        </TableCell>
                        <TableCell className="text-gray-700">{formatDate(brand.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="md:hidden space-y-3">
                {brands.map((brand) => (
                  <li key={brand.id} className="border rounded-md p-3 flex items-start gap-3">
                    <BrandLogo brand={brand} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-medium text-gray-900 truncate">{brand.name}</h2>
                        <StatusBadge status={brand.status} />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {brand.affiliate_network || "No affiliate network"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Added {formatDate(brand.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
