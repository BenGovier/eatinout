"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Store } from "lucide-react"
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

export default function AdminNationalBrandsPage() {
  const [brands, setBrands] = useState<NationalBrand[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

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
  }, [])

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
        {!isLoading && (
          <div className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
            {brands.length} {brands.length === 1 ? "brand" : "brands"}
          </div>
        )}
      </div>

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
