"use client"

import {
  useState, useMemo, useCallback, useEffect, useRef, memo,
} from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search, X, Store, ChevronDown, ChevronRight,
  Tag as TagIcon, Plus, Loader2,
} from "lucide-react"
import type { Tag, TagOfferAssociation, Restaurant, Offer } from "./tag-table"
import { RemoveFromOfferDialog } from "./tag-dialogs"

// ─── Types ────────────────────────────────────────────────────────────────────

export type RestaurantSortBy =
  | "name-asc" | "name-desc"
  | "tags-desc" | "tags-asc"
  | "offers-desc" | "offers-asc"

interface RestaurantBrowserProps {
  tags: Tag[]
  associations: TagOfferAssociation[]
  restaurants: Restaurant[]
  offers: Offer[]
  // Server-side pagination + search — all managed by parent
  hasMoreRestaurants: boolean
  isLoadingRestaurants: boolean
  totalRestaurants: number
  restaurantSearch: string
  onRestaurantSearchChange: (v: string) => void
  onLoadMoreRestaurants: () => void
  onAssignTag: (tagId: string, offerId: string) => void
  onRemoveAssociation: (tagId: string, offerId: string) => void
  // ── NEW: sort lifted to parent ──────────────────────────────────────────────
  sortBy: RestaurantSortBy
  onSortChange: (v: RestaurantSortBy) => void
}

// ─── Lookup maps ──────────────────────────────────────────────────────────────

interface LookupMaps {
  offerTagIds: Map<string, string[]>
  tagById: Map<string, Tag>
  offersByRestaurant: Map<string, Offer[]>
  tagCountByRestaurant: Map<string, { active: number; total: number }>
  activeOfferCountByRestaurant: Map<string, number>
}

function buildLookupMaps(
  tags: Tag[], associations: TagOfferAssociation[], offers: Offer[], restaurants: Restaurant[],
): LookupMaps {
  const tagById = new Map(tags.map((t) => [t.id, t]))

  const offerTagIds = new Map<string, string[]>()
  for (const a of associations) {
    const arr = offerTagIds.get(a.offerId)
    if (arr) arr.push(a.tagId)
    else offerTagIds.set(a.offerId, [a.tagId])
  }

  const offersByRestaurant = new Map<string, Offer[]>()
  const activeOfferCountByRestaurant = new Map<string, number>()
  for (const o of offers) {
    const arr = offersByRestaurant.get(o.restaurantId)
    if (arr) arr.push(o)
    else offersByRestaurant.set(o.restaurantId, [o])
    if (o.status === "active") {
      activeOfferCountByRestaurant.set(
        o.restaurantId, (activeOfferCountByRestaurant.get(o.restaurantId) ?? 0) + 1,
      )
    }
  }

  const tagCountByRestaurant = new Map<string, { active: number; total: number }>()
  for (const r of restaurants) {
    const restOffers = offersByRestaurant.get(r.id) ?? []
    const allTagIds = new Set<string>()
    const activeTagIds = new Set<string>()
    // for (const o of restOffers) {
    //   for (const tid of (offerTagIds.get(o.id) ?? [])) {
    //     allTagIds.add(tid)
    //     if (o.status === "active") activeTagIds.add(tid)
    //   }
    // }
    for (const o of restOffers) {
      for (const tid of (offerTagIds.get(o.id) ?? [])) {
        const tagExists = tagById.has(tid) // ✅ only valid tags

        if (!tagExists) continue

        allTagIds.add(tid)
        if (o.status === "active") activeTagIds.add(tid)
      }
    }
    tagCountByRestaurant.set(r.id, { active: activeTagIds.size, total: allTagIds.size })
  }

  return { offerTagIds, tagById, offersByRestaurant, tagCountByRestaurant, activeOfferCountByRestaurant }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RestaurantBrowser({
  tags, associations, restaurants, offers,
  hasMoreRestaurants, isLoadingRestaurants, totalRestaurants,
  restaurantSearch, onRestaurantSearchChange,
  onLoadMoreRestaurants,
  onAssignTag, onRemoveAssociation,
  // ── NEW ──
  sortBy, onSortChange,
}: RestaurantBrowserProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Lookup maps — rebuilt only when data changes
  const maps = useMemo(
    () => buildLookupMaps(tags, associations, offers, restaurants),
    [tags, associations, offers, restaurants],
  )

  // ── REMOVED: sortedRestaurants useMemo — sorting is now done server-side ──
  // restaurants arrive pre-sorted from the server; render them directly

  // IntersectionObserver — triggers server fetch when bottom sentinel visible
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMoreRestaurants || isLoadingRestaurants) return
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMoreRestaurants() },
      { threshold: 0.1 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMoreRestaurants, isLoadingRestaurants, onLoadMoreRestaurants])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  return (
    <TooltipProvider>
      <Card className="border border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-foreground">Browse by Restaurant</CardTitle>
          <CardDescription>View restaurants and manage tags on their offers directly</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Search + Sort */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search restaurants..."
                value={restaurantSearch}
                onChange={(e) => onRestaurantSearchChange(e.target.value)}
                className="pl-9"
              />
              {restaurantSearch && (
                <button
                  onClick={() => onRestaurantSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* ── CHANGED: value/onValueChange now use parent-controlled sortBy/onSortChange ── */}
            <Select value={sortBy} onValueChange={(v) => onSortChange(v as RestaurantSortBy)}>
              <SelectTrigger className="w-[200px] shrink-0">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tags-desc">Most Tags</SelectItem>
                <SelectItem value="tags-asc">Fewest Tags</SelectItem>
                <SelectItem value="offers-desc">Most Offers</SelectItem>
                <SelectItem value="offers-asc">Fewest Offers</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Result count */}
          {restaurantSearch && (
            <p className="text-sm text-muted-foreground">
              {isLoadingRestaurants
                ? "Searching…"
                : `${totalRestaurants} restaurant${totalRestaurants !== 1 ? "s" : ""} found for "${restaurantSearch}"`}
            </p>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Restaurant</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Offers</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Unique Tags</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.length === 0 && !isLoadingRestaurants ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                      {restaurantSearch ? "No restaurants found matching your search." : "No restaurants available."}
                    </TableCell>
                  </TableRow>
                ) : (
                  // ── CHANGED: render `restaurants` directly (pre-sorted by server) ──
                  restaurants.map((restaurant) => (
                    <RestaurantRow
                      key={restaurant.id}
                      restaurant={restaurant}
                      isExpanded={expandedIds.has(restaurant.id)}
                      maps={maps} allTags={tags}
                      onToggleExpand={toggleExpand}
                      onAssignTag={onAssignTag}
                      onRemoveAssociation={onRemoveAssociation}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Sentinel */}
          <div ref={sentinelRef} className="h-1" />

          {isLoadingRestaurants && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {restaurantSearch ? "Searching…" : "Loading more restaurants…"}
            </div>
          )}
          {!hasMoreRestaurants && restaurants.length > 0 && (
            <p className="py-1 text-center text-xs text-muted-foreground">
              {restaurantSearch
                ? `All ${totalRestaurants} matching restaurants shown`
                : `All ${totalRestaurants} restaurants loaded`}
            </p>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

// ─── Restaurant Row ───────────────────────────────────────────────────────────

const RestaurantRow = memo(function RestaurantRow({
  restaurant, isExpanded, maps, allTags,
  onToggleExpand, onAssignTag, onRemoveAssociation,
}: {
  restaurant: Restaurant; isExpanded: boolean; maps: LookupMaps; allTags: Tag[]
  onToggleExpand: (id: string) => void
  onAssignTag: (tagId: string, offerId: string) => void
  onRemoveAssociation: (tagId: string, offerId: string) => void
}) {
  const activeOfferCount = restaurant.activeOffersCount ?? 0
  const tagCount = restaurant.tagCount ?? 0

  const offersWithTags = useMemo(() => {
    if (!isExpanded) return []
    return (maps.offersByRestaurant.get(restaurant.id) ?? [])
      .slice()
      .sort((a, b) => {
        if (a.status === "active" && b.status !== "active") return -1
        if (a.status !== "active" && b.status === "active") return 1
        return a.title.localeCompare(b.title)
      })
      .map((offer) => ({
        offer,
        tags: (maps.offerTagIds.get(offer.id) ?? [])
          .map((tid) => maps.tagById.get(tid))
          .filter((t): t is Tag => t !== undefined),
      }))
  }, [isExpanded, restaurant.id, maps])

  return (
    <>
      <TableRow
        className={`cursor-pointer transition-colors hover:bg-muted/50 ${isExpanded ? "border-b-0 bg-muted/30" : ""}`}
        onClick={() => onToggleExpand(restaurant.id)}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{restaurant.name}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted">{activeOfferCount}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
            {tagCount} tag{tagCount !== 1 ? "s" : ""}
          </Badge>
        </TableCell>
        <TableCell>
          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="p-0">
            <ExpandedRestaurantOffers
              restaurantName={restaurant.name} offersWithTags={offersWithTags}
              allTags={allTags} offerTagIds={maps.offerTagIds}
              onAssignTag={onAssignTag} onRemoveAssociation={onRemoveAssociation}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  )
})

// ─── Expanded Restaurant Offers ───────────────────────────────────────────────

const ExpandedRestaurantOffers = memo(function ExpandedRestaurantOffers({
  restaurantName, offersWithTags, allTags, offerTagIds, onAssignTag, onRemoveAssociation,
}: {
  restaurantName: string
  offersWithTags: { offer: Offer; tags: Tag[] }[]
  allTags: Tag[]
  offerTagIds: Map<string, string[]>
  onAssignTag: (tagId: string, offerId: string) => void
  onRemoveAssociation: (tagId: string, offerId: string) => void
}) {
  const [addingToOffer, setAddingToOffer] = useState<string | null>(null)
  const [removeDialog, setRemoveDialog] = useState<{
    open: boolean; tagId: string; tagName: string; offerId: string; offerTitle: string
  } | null>(null)

  if (offersWithTags.length === 0) {
    return <div className="px-10 py-4 text-sm text-muted-foreground">No offers for this restaurant.</div>
  }

  return (
    <>
      <div className="bg-muted/40 px-10 py-3">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Offers by {restaurantName} ({offersWithTags.length})
        </p>
        <div className="flex flex-col gap-3">
          {offersWithTags.map(({ offer, tags: offerTags }) => (
            <OfferCard
              key={offer.id} offer={offer} offerTags={offerTags} allTags={allTags} offerTagIds={offerTagIds}
              isAddingTags={addingToOffer === offer.id}
              onToggleAddTags={() => setAddingToOffer(addingToOffer === offer.id ? null : offer.id)}
              onRemoveTag={(tagId, tagName) => setRemoveDialog({ open: true, tagId, tagName, offerId: offer.id, offerTitle: offer.title })}
              onAssignTag={onAssignTag}
            />
          ))}
        </div>
      </div>
      {removeDialog && (
        <RemoveFromOfferDialog
          open={removeDialog.open} onOpenChange={(open) => { if (!open) setRemoveDialog(null) }}
          tagName={removeDialog.tagName} offerTitle={removeDialog.offerTitle} restaurantName={restaurantName}
          onConfirm={() => { onRemoveAssociation(removeDialog.tagId, removeDialog.offerId); setRemoveDialog(null) }}
        />
      )}
    </>
  )
})

const getStatusLabel = (status: string) => {
  switch (status?.toLowerCase().trim()) {
    case "active":
      return { label: "Active", className: "bg-emerald-100 text-emerald-700" }

    case "inactive":
      return { label: "Inactive", className: "bg-blue-100 text-blue-700" }

    case "expired":
      return { label: "Expired", className: "bg-muted text-muted-foreground" }

    default:
      return { label: status || "Unknown", className: "bg-muted text-muted-foreground" }
  }
}


// ─── Offer Card ───────────────────────────────────────────────────────────────

const OfferCard = memo(function OfferCard({
  offer, offerTags, allTags, offerTagIds,
  isAddingTags, onToggleAddTags, onRemoveTag, onAssignTag,
}: {
  offer: Offer; offerTags: Tag[]; allTags: Tag[]; offerTagIds: Map<string, string[]>
  isAddingTags: boolean; onToggleAddTags: () => void
  onRemoveTag: (tagId: string, tagName: string) => void
  onAssignTag: (tagId: string, offerId: string) => void
}) {
  const statusObj = getStatusLabel(offer.status)
  return (
    <div className={`rounded-md border border-border bg-card p-4 ${offer.status === "expired" || offer.status === "inactive" ? "opacity-60" : ""
      }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{offer.title}</span>
            <Badge variant="secondary" className={statusObj.className}>
              {statusObj.label}
            </Badge>
          </div>
          {offerTags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[...offerTags].sort((a, b) => a.name.localeCompare(b.name)).map((tag) => (
                <Badge key={tag.id} variant="secondary" className="gap-1 bg-muted text-foreground hover:bg-muted">
                  <TagIcon className="h-3 w-3 text-muted-foreground" />
                  {tag.name}
                  <button
                    onClick={() => onRemoveTag(tag.id, tag.name)}
                    className="ml-0.5 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                    aria-label={`Remove tag ${tag.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">No tags assigned</p>
          )}
        </div>
        {offer.status === "active" && (
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs" onClick={onToggleAddTags}>
            {isAddingTags ? <><X className="h-3.5 w-3.5" />Close</> : <><Plus className="h-3.5 w-3.5" />Add Tags</>}
          </Button>
        )}
      </div>
      {isAddingTags && (
        <InlineTagPicker offerId={offer.id} allTags={allTags} offerTagIds={offerTagIds} onAssignTag={onAssignTag} />
      )}
    </div>
  )
})

// ─── Inline Tag Picker ────────────────────────────────────────────────────────

const InlineTagPicker = memo(function InlineTagPicker({
  offerId, allTags, offerTagIds, onAssignTag,
}: {
  offerId: string; allTags: Tag[]; offerTagIds: Map<string, string[]>
  onAssignTag: (tagId: string, offerId: string) => void
}) {
  const [tagSearch, setTagSearch] = useState("")
  const [justAdded, setJustAdded] = useState<string[]>([])

  const assignedTagIds = useMemo(() => new Set(offerTagIds.get(offerId) ?? []), [offerTagIds, offerId])

  const [debouncedTagSearch, setDebouncedTagSearch] = useState("")
  const pickerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (pickerDebounce.current) clearTimeout(pickerDebounce.current)
    pickerDebounce.current = setTimeout(() => setDebouncedTagSearch(tagSearch), 200)
    return () => { if (pickerDebounce.current) clearTimeout(pickerDebounce.current) }
  }, [tagSearch])

  const available = useMemo(() => {
    const q = debouncedTagSearch.toLowerCase().trim()

    return allTags
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allTags, debouncedTagSearch])

  const handleAssign = useCallback((tag: Tag) => {
    onAssignTag(tag.id, offerId)
    setJustAdded((prev) => [...prev, tag.name])
    setTimeout(() => setJustAdded((prev) => prev.filter((n) => n !== tag.name)), 2000)
  }, [onAssignTag, offerId])

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search tags to add..." value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} className="h-8 pl-8 text-sm" />
        {tagSearch && (
          <button onClick={() => setTagSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {justAdded.length > 0 && <p className="text-xs text-emerald-600">Added: {justAdded.join(", ")}</p>}
      <ScrollArea className=" w-full overflow-y-auto pr-2">
        <div className="flex flex-wrap gap-1.5 w-full content-start">
          {available.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">
              {tagSearch ? "No matching tags available." : "All tags are already assigned."}
            </p>
          ) : (
            available.map((tag) => {
              const isSelected = assignedTagIds.has(tag.id)

              return (
                <button
                  key={tag.id}
                  onClick={() => !isSelected && handleAssign(tag)}
                  disabled={isSelected}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors
  ${isSelected
                      ? "bg-[rgb(239,68,68)]/10 border-[rgb(239,68,68)] text-[rgb(239,68,68)] cursor-not-allowed"
                      : "bg-card border-border text-foreground hover:border-[rgb(239,68,68)] hover:bg-[rgb(239,68,68)]/10 hover:text-[rgb(239,68,68)]"
                    }`}
                >
                  <Plus className="h-3 w-3" />
                  {tag.name}
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
})