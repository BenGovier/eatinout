"use client"

import { useState, type FormEvent } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  AlertCircle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  MousePointerClick,
  RefreshCw,
  Store,
  Tag,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

type Bucket = "day" | "week" | "month"
type RangeKey = "7" | "30" | "90" | "custom"

interface PerformanceResponse {
  success: true
  filters: { from: string; to: string; brandId: string | null; bucket: Bucket }
  summary: {
    totalClaims: number
    uniqueCustomers: number
    claimsOverTime: { period: string | null; claims: number }[]
    topBrands: { brandId: string | null; brandName: string | null; brandSlug: string | null; claims: number }[]
    topOffers: { offerId: string | null; offerTitle: string | null; brandName: string | null; claims: number }[]
    byMethod: { method: string | null; claims: number }[]
  }
  activity: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    items: {
      claimedAt: string
      redemptionMethod: string | null
      offerId: string
      offerTitle: string | null
      brandId: string | null
      brandName: string | null
      customer: {
        userId: string
        firstName: string | null
        lastName: string | null
        email: string | null
        currentSubscriptionStatus: string | null
      }
    }[]
  }
}

interface BrandOption {
  id: string
  name: string
}

interface AppliedRange {
  key: RangeKey
  from: string
  to: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_RANGE_DAYS = 731
const ALL_BRANDS = "all"

const PRESETS: { key: Exclude<RangeKey, "custom">; label: string; days: number }[] = [
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
]

const METHOD_LABELS: Record<string, string> = {
  link: "Affiliate link",
  code: "Voucher code",
  link_and_code: "Link and code",
}
const METHOD_ORDER = ["link", "code", "link_and_code"]
const METHOD_COLORS: Record<string, string> = {
  link: "bg-red-600",
  code: "bg-amber-500",
  link_and_code: "bg-gray-700",
}

const chartConfig = {
  claims: { label: "Claims", color: "#b91c1c" },
} satisfies ChartConfig

class PerformanceError extends Error {}

function presetRange(key: Exclude<RangeKey, "custom">): AppliedRange {
  const days = PRESETS.find((preset) => preset.key === key)?.days ?? 30
  return { key, from: new Date(Date.now() - days * DAY_MS).toISOString(), to: null }
}

async function fetchPerformance(params: URLSearchParams): Promise<PerformanceResponse> {
  let response: Response
  try {
    response = await fetch(`/api/admin/national/performance?${params.toString()}`, { cache: "no-store" })
  } catch {
    throw new PerformanceError("Network error. Check your connection and try again.")
  }
  const data = await response.json().catch(() => null)
  if (response.ok && data?.success) return data as PerformanceResponse

  if (response.status === 401) throw new PerformanceError("Your admin session has expired. Please sign in again.")
  if (response.status === 403) throw new PerformanceError("You do not have permission to view this report.")
  if (response.status === 404) throw new PerformanceError("The selected brand could not be found.")
  if (response.status === 400) {
    const details = data?.errors ? Object.values(data.errors as Record<string, string>).join(". ") : ""
    throw new PerformanceError(`These filters could not be used. ${details}`.trim())
  }
  throw new PerformanceError("The report is temporarily unavailable. Please try again shortly.")
}

async function fetchBrands(): Promise<BrandOption[]> {
  const response = await fetch("/api/admin/national/brands", { cache: "no-store" })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.success || !Array.isArray(data.brands)) throw new Error("Brands unavailable")
  return (data.brands as { id: string; name: string }[]).map((brand) => ({ id: brand.id, name: brand.name }))
}

const numberFormat = new Intl.NumberFormat("en-GB")

function formatNumber(value: number) {
  return numberFormat.format(value)
}

function formatPercent(part: number, total: number) {
  if (total <= 0) return "0%"
  const percent = (part / total) * 100
  return `${percent < 10 && percent > 0 ? percent.toFixed(1) : Math.round(percent)}%`
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDay(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function formatPeriod(period: string | null, bucket: Bucket) {
  if (!period) return "Unknown"
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(period) ? `${period}T00:00:00Z` : period)
  if (Number.isNaN(date.getTime())) return period
  if (bucket === "month") return date.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
  const label = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
  return bucket === "week" ? `w/c ${label}` : label
}

function methodLabel(method: string | null) {
  return (method && METHOD_LABELS[method]) || "Not recorded"
}

function customerName(first: string | null, last: string | null) {
  return [first, last].filter((part) => part && part.trim()).join(" ") || "—"
}

function statusLabel(status: string | null) {
  if (!status) return "Not recorded"
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
}

function statusStyle(status: string | null) {
  if (status === "active" || status === "trialing") return "bg-green-50 text-green-700 border-green-200"
  if (status === "past_due" || status === "paused") return "bg-amber-50 text-amber-700 border-amber-200"
  return "bg-gray-50 text-gray-700 border-gray-200"
}

function StatusBadge({ status }: { status: string | null }) {
  return (
    <span className={`inline-block border px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle(status)}`}>
      {statusLabel(status)}
    </span>
  )
}

function SectionEmpty({ message }: { message: string }) {
  return <p className="text-sm text-gray-500 py-6 text-center">{message}</p>
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  isText = false,
}: {
  icon: typeof Users
  label: string
  value: string
  detail?: string
  isText?: boolean
}) {
  return (
    <Card className="shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p
              className={`mt-2 font-semibold text-gray-900 break-words ${isText ? "text-lg leading-snug line-clamp-2" : "text-2xl tabular-nums"}`}
              title={isText ? value : undefined}
            >
              {value}
            </p>
            {detail && <p className="mt-1 text-sm text-gray-500 break-words">{detail}</p>}
          </div>
          <div className="rounded-md bg-red-50 p-2 flex-shrink-0">
            <Icon className="h-5 w-5 text-red-700" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading performance report">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-28 rounded-lg border bg-white p-5 animate-pulse">
            <div className="h-3 w-1/2 rounded bg-gray-200" />
            <div className="mt-4 h-6 w-1/3 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="h-72 rounded-lg border bg-white animate-pulse" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-lg border bg-white animate-pulse" />
        <div className="h-64 rounded-lg border bg-white animate-pulse" />
      </div>
    </div>
  )
}

function Filters({
  range,
  onRangeChange,
  brandId,
  onBrandChange,
  brands,
  brandsError,
}: {
  range: AppliedRange
  onRangeChange: (range: AppliedRange) => void
  brandId: string
  onBrandChange: (brandId: string) => void
  brands: BrandOption[]
  brandsError: boolean
}) {
  const [showCustom, setShowCustom] = useState(range.key === "custom")
  const [customFrom, setCustomFrom] = useState(range.key === "custom" ? range.from : "")
  const [customTo, setCustomTo] = useState(range.key === "custom" ? (range.to ?? "") : "")
  const [customError, setCustomError] = useState<string | null>(null)

  function applyCustom(event: FormEvent) {
    event.preventDefault()
    if (!customFrom || !customTo) {
      setCustomError("Choose both a start date and an end date.")
      return
    }
    if (customFrom > customTo) {
      setCustomError("The start date must be on or before the end date.")
      return
    }
    const days = (Date.parse(customTo) - Date.parse(customFrom)) / DAY_MS + 1
    if (days > MAX_RANGE_DAYS) {
      setCustomError(`Choose a range of ${MAX_RANGE_DAYS} days or fewer.`)
      return
    }
    setCustomError(null)
    onRangeChange({ key: "custom", from: customFrom, to: customTo })
  }

  return (
    <Card className="shadow-md">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-700" id="range-label">
              Date range
            </span>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="range-label">
              {PRESETS.map((preset) => {
                const active = range.key === preset.key && !showCustom
                return (
                  <Button
                    key={preset.key}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className={active ? "bg-red-700 hover:bg-red-800 text-white" : ""}
                    aria-pressed={active}
                    onClick={() => {
                      setShowCustom(false)
                      setCustomError(null)
                      onRangeChange(presetRange(preset.key))
                    }}
                  >
                    {preset.label}
                  </Button>
                )
              })}
              <Button
                type="button"
                size="sm"
                variant={showCustom ? "default" : "outline"}
                className={showCustom ? "bg-red-700 hover:bg-red-800 text-white" : ""}
                aria-pressed={showCustom}
                aria-expanded={showCustom}
                onClick={() => setShowCustom(true)}
              >
                Custom range
              </Button>
            </div>
          </div>

          <div className="space-y-2 lg:w-64">
            <Label htmlFor="brand-filter">Brand</Label>
            <Select value={brandId} onValueChange={onBrandChange}>
              <SelectTrigger id="brand-filter">
                <SelectValue placeholder="All brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BRANDS}>All brands</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {brandsError && <p className="text-xs text-amber-700">Brand list unavailable. Showing all brands.</p>}
          </div>
        </div>

        {showCustom && (
          <form onSubmit={applyCustom} className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="custom-from">From</Label>
              <Input
                id="custom-from"
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(event) => setCustomFrom(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-to">To</Label>
              <Input
                id="custom-to"
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(event) => setCustomTo(event.target.value)}
              />
            </div>
            <Button type="submit" size="sm" className="bg-red-700 hover:bg-red-800 text-white sm:mb-0.5">
              Apply dates
            </Button>
            {customError && (
              <p className="text-sm text-red-700 sm:self-center" role="alert">
                {customError}
              </p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  )
}

function ClaimsChart({
  rows,
  bucket,
  onBucketChange,
}: {
  rows: PerformanceResponse["summary"]["claimsOverTime"]
  bucket: Bucket
  onBucketChange: (bucket: Bucket) => void
}) {
  const data = rows.map((row) => ({ label: formatPeriod(row.period, bucket), claims: row.claims }))
  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-red-700">Claims over time</CardTitle>
          <CardDescription>Number of offer claims in each period</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="bucket" className="text-sm text-gray-600">
            Group by
          </Label>
          <Select value={bucket} onValueChange={(value) => onBucketChange(value as Bucket)}>
            <SelectTrigger id="bucket" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <SectionEmpty message="No claims in this period." />
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full aspect-auto">
            <BarChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={48} />
              <ChartTooltip cursor={{ fill: "#fef2f2" }} content={<ChartTooltipContent />} />
              <Bar dataKey="claims" fill="var(--color-claims)" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function BrandPerformance({
  rows,
  totalClaims,
}: {
  rows: PerformanceResponse["summary"]["topBrands"]
  totalClaims: number
}) {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-red-700">Brand performance</CardTitle>
        <CardDescription>Top {rows.length || 10} brands by claims, as a share of all claims shown</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <SectionEmpty message="No brand claims in this period." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Claims</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.brandId ?? `brand-${index}`}>
                  <TableCell className="font-medium text-gray-900">{row.brandName || "Unknown brand"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(row.claims)}</TableCell>
                  <TableCell className="text-right tabular-nums text-gray-600">
                    {formatPercent(row.claims, totalClaims)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function TopOffers({ rows }: { rows: PerformanceResponse["summary"]["topOffers"] }) {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-red-700">Top offers</CardTitle>
        <CardDescription>The 10 most frequently claimed offers</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <SectionEmpty message="No offer claims in this period." />
        ) : (
          <ol className="divide-y">
            {rows.slice(0, 10).map((row, index) => (
              <li key={row.offerId ?? `offer-${index}`} className="flex items-center gap-3 py-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-semibold text-red-700">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 break-words">{row.offerTitle || "Untitled offer"}</p>
                  <p className="text-sm text-gray-500">{row.brandName || "Unknown brand"}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-gray-900 whitespace-nowrap">
                  {formatNumber(row.claims)} {row.claims === 1 ? "claim" : "claims"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

function RedemptionMethods({
  rows,
  totalClaims,
}: {
  rows: PerformanceResponse["summary"]["byMethod"]
  totalClaims: number
}) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = row.method && METHOD_LABELS[row.method] ? row.method : "other"
    counts.set(key, (counts.get(key) ?? 0) + row.claims)
  }
  const display = [...METHOD_ORDER, ...(counts.has("other") ? ["other"] : [])].map((key) => ({
    key,
    label: key === "other" ? "Not recorded" : METHOD_LABELS[key],
    claims: counts.get(key) ?? 0,
  }))

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-red-700">Redemption methods</CardTitle>
        <CardDescription>How customers received the offers they claimed</CardDescription>
      </CardHeader>
      <CardContent>
        {totalClaims === 0 ? (
          <SectionEmpty message="No claims in this period." />
        ) : (
          <ul className="space-y-4">
            {display.map((item) => (
              <li key={item.key}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-gray-900">{item.label}</span>
                  <span className="tabular-nums text-gray-600">
                    {formatNumber(item.claims)} ({formatPercent(item.claims, totalClaims)})
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-100" aria-hidden="true">
                  <div
                    className={`h-2 rounded-full ${METHOD_COLORS[item.key] ?? "bg-gray-400"}`}
                    style={{ width: `${totalClaims > 0 ? (item.claims / totalClaims) * 100 : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function RecentActivity({
  activity,
  onPageChange,
  isFetching,
}: {
  activity: PerformanceResponse["activity"]
  onPageChange: (page: number) => void
  isFetching: boolean
}) {
  const { items, page, totalPages, total, pageSize } = activity
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-red-700">Recent customer activity</CardTitle>
        <CardDescription>
          Each row is an offer claim, not a completed purchase. Membership shows the customer&apos;s current recorded
          status, not their status when they claimed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <SectionEmpty message={total > 0 ? "No claims on this page." : "No customer claims in this period."} />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Date and time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Offer claimed</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="whitespace-nowrap">Current membership</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={`${item.claimedAt}-${item.offerId}-${item.customer.userId}`}>
                      <TableCell className="whitespace-nowrap text-gray-700">{formatDateTime(item.claimedAt)}</TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {customerName(item.customer.firstName, item.customer.lastName)}
                      </TableCell>
                      <TableCell className="text-gray-700 break-all">{item.customer.email || "—"}</TableCell>
                      <TableCell className="text-gray-700">{item.brandName || "Unknown brand"}</TableCell>
                      <TableCell className="text-gray-700">{item.offerTitle || "Untitled offer"}</TableCell>
                      <TableCell className="whitespace-nowrap text-gray-700">{methodLabel(item.redemptionMethod)}</TableCell>
                      <TableCell>
                        <StatusBadge status={item.customer.currentSubscriptionStatus} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="md:hidden space-y-3">
              {items.map((item) => (
                <li
                  key={`${item.claimedAt}-${item.offerId}-${item.customer.userId}`}
                  className="border rounded-md p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 break-words">
                        {customerName(item.customer.firstName, item.customer.lastName)}
                      </p>
                      <p className="text-sm text-gray-500 break-all">{item.customer.email || "—"}</p>
                    </div>
                    <StatusBadge status={item.customer.currentSubscriptionStatus} />
                  </div>
                  <p className="text-sm text-gray-900 break-words">
                    {item.offerTitle || "Untitled offer"}
                    <span className="text-gray-500">{` · ${item.brandName || "Unknown brand"}`}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(item.claimedAt)} · {methodLabel(item.redemptionMethod)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}

        {totalPages > 0 && (
          <nav
            className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
            aria-label="Activity pages"
          >
            <p className="text-sm text-gray-600">
              Showing {formatNumber(start)}–{formatNumber(end)} of {formatNumber(total)} claims
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </Button>
              <span className="text-sm text-gray-700 tabular-nums px-1">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isFetching}
                onClick={() => onPageChange(page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </nav>
        )}
      </CardContent>
    </Card>
  )
}

function rangeDescription(filters: PerformanceResponse["filters"]) {
  const from = new Date(filters.from)
  const lastIncluded = new Date(new Date(filters.to).getTime() - 1)
  if (Number.isNaN(from.getTime()) || Number.isNaN(lastIncluded.getTime())) return null
  return `${formatDay(from)} – ${formatDay(lastIncluded)}`
}

export default function NationalPerformancePage() {
  const [range, setRange] = useState<AppliedRange>(() => presetRange("30"))
  const [brandId, setBrandId] = useState(ALL_BRANDS)
  const [bucket, setBucket] = useState<Bucket>("day")
  const [page, setPage] = useState(1)

  const params = new URLSearchParams({ from: range.from, bucket, page: String(page) })
  if (range.to) params.set("to", range.to)
  if (brandId !== ALL_BRANDS) params.set("brandId", brandId)

  const report = useQuery({
    queryKey: ["admin-national-performance", range.from, range.to, brandId, bucket, page],
    queryFn: () => fetchPerformance(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  })

  const brandsQuery = useQuery({
    queryKey: ["admin-national-brand-options"],
    queryFn: fetchBrands,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const data = report.data
  const summary = data?.summary
  const topBrand = summary?.topBrands[0]
  const topOffer = summary?.topOffers[0]
  const selectedBrandName =
    brandId === ALL_BRANDS ? null : (brandsQuery.data?.find((brand) => brand.id === brandId)?.name ?? null)

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">National Performance</h1>
          <p className="text-gray-600 mt-1">How customers are claiming national brand offers</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => report.refetch()}
          disabled={report.isFetching}
          className="self-start"
        >
          {report.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          )}
          Refresh
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <p>
          These figures count <strong>claims</strong>: a customer revealing a code or opening a brand link from
          EatinOut. They do not confirm that a purchase was completed with the brand.
        </p>
      </div>

      <Filters
        range={range}
        onRangeChange={(next) => {
          setRange(next)
          setPage(1)
        }}
        brandId={brandId}
        onBrandChange={(next) => {
          setBrandId(next)
          setPage(1)
        }}
        brands={brandsQuery.data ?? []}
        brandsError={brandsQuery.isError}
      />

      {report.isError && (
        <div
          className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>
              {report.error instanceof PerformanceError
                ? report.error.message
                : "The report could not be loaded. Please try again."}
              {data && " The figures below are from your previous selection."}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => report.refetch()} className="self-start bg-white">
            Try again
          </Button>
        </div>
      )}

      {!data && report.isPending && <DashboardSkeleton />}

      {data && summary && (
        <div
          className={`space-y-6 transition-opacity ${report.isPlaceholderData ? "opacity-60" : ""}`}
          aria-busy={report.isFetching}
        >
          <p className="text-sm text-gray-600">
            {rangeDescription(data.filters)}
            {selectedBrandName ? ` · ${selectedBrandName}` : " · All brands"}
            {report.isFetching && (
              <span className="ml-2 inline-flex items-center gap-1 text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                Updating
              </span>
            )}
          </p>

          <section aria-label="Performance overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={MousePointerClick} label="Total offer claims" value={formatNumber(summary.totalClaims)} />
            <StatCard
              icon={Users}
              label="Unique customers claiming"
              value={formatNumber(summary.uniqueCustomers)}
            />
            <StatCard
              icon={Store}
              label="Most popular brand"
              isText
              value={topBrand ? topBrand.brandName || "Unknown brand" : "No claims yet"}
              detail={topBrand ? `${formatNumber(topBrand.claims)} ${topBrand.claims === 1 ? "claim" : "claims"}` : undefined}
            />
            <StatCard
              icon={Tag}
              label="Most popular offer"
              isText
              value={topOffer ? topOffer.offerTitle || "Untitled offer" : "No claims yet"}
              detail={
                topOffer
                  ? `${topOffer.brandName || "Unknown brand"} · ${formatNumber(topOffer.claims)} ${topOffer.claims === 1 ? "claim" : "claims"}`
                  : undefined
              }
            />
          </section>

          {summary.totalClaims === 0 && (
            <div className="rounded-md border bg-white p-6 text-center">
              <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
              <p className="font-medium text-gray-900">No claims recorded for this selection</p>
              <p className="text-sm text-gray-500 mt-1">Try a longer date range or a different brand.</p>
            </div>
          )}

          <ClaimsChart
            rows={summary.claimsOverTime}
            bucket={data.filters.bucket}
            onBucketChange={(next) => setBucket(next)}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <BrandPerformance rows={summary.topBrands} totalClaims={summary.totalClaims} />
            <TopOffers rows={summary.topOffers} />
          </div>

          <RedemptionMethods rows={summary.byMethod} totalClaims={summary.totalClaims} />

          <RecentActivity activity={data.activity} onPageChange={setPage} isFetching={report.isFetching} />
        </div>
      )}
    </div>
  )
}
