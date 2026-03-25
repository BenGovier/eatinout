"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Search, Check, X, Store, UtensilsCrossed, Tag as TagIcon } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import type { Tag, Offer, Restaurant, TagOfferAssociation } from "./tag-table"

interface AssignTagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tags: Tag[]
  restaurants: Restaurant[]
  offers: Offer[]
  associations: TagOfferAssociation[]
  onAssign: (tagId: string, offerId: string) => void
}

export function AssignTagDialog({
  open, onOpenChange,
  tags, restaurants, offers, associations,
  onAssign,
}: AssignTagDialogProps) {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("")
  const [selectedOfferId, setSelectedOfferId]           = useState("")
  const [tagSearch, setTagSearch]                       = useState("")
  const [debouncedTagSearch, setDebouncedTagSearch]     = useState("")
  const [pendingTagIds, setPendingTagIds]               = useState<Set<string>>(new Set())

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedTagSearch(tagSearch), 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [tagSearch])

  useEffect(() => {
    if (!open) return
    setSelectedRestaurantId("")
    setSelectedOfferId("")
    setTagSearch("")
    setDebouncedTagSearch("")
    setPendingTagIds(new Set())
  }, [open])

  useEffect(() => {
    setSelectedOfferId("")
    setPendingTagIds(new Set())
    setTagSearch("")
    setDebouncedTagSearch("")
  }, [selectedRestaurantId])

  useEffect(() => {
    setPendingTagIds(new Set())
    setTagSearch("")
    setDebouncedTagSearch("")
  }, [selectedOfferId])

  // ── Lookup maps ───────────────────────────────────────────────────────────

  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  const offerTagIdMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const a of associations) {
      const s = map.get(a.offerId)
      if (s) s.add(a.tagId)
      else map.set(a.offerId, new Set([a.tagId]))
    }
    return map
  }, [associations])

  const offersByRestaurant = useMemo(() => {
    const map = new Map<string, Offer[]>()
    for (const o of offers) {
      if (o.status !== "active") continue
      const arr = map.get(o.restaurantId)
      if (arr) arr.push(o)
      else map.set(o.restaurantId, [o])
    }
    return map
  }, [offers])

  const sortedRestaurants = useMemo(
    () => [...restaurants].sort((a, b) => a.name.localeCompare(b.name)),
    [restaurants],
  )

  // ── Derived ───────────────────────────────────────────────────────────────

  const restaurantOffers = useMemo(
    () => offersByRestaurant.get(selectedRestaurantId) ?? [],
    [offersByRestaurant, selectedRestaurantId],
  )

  const assignedTagIds = useMemo(
    () => offerTagIdMap.get(selectedOfferId) ?? new Set<string>(),
    [offerTagIdMap, selectedOfferId],
  )

  const assignedTags = useMemo(
    () => [...assignedTagIds]
      .map((id) => tagById.get(id))
      .filter((t): t is Tag => t !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [assignedTagIds, tagById],
  )

  const pendingTags = useMemo(
    () => [...pendingTagIds]
      .map((id) => tagById.get(id))
      .filter((t): t is Tag => t !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [pendingTagIds, tagById],
  )

  const availableTags = useMemo(() => {
    const q = debouncedTagSearch.toLowerCase().trim()
    return tags
      .filter((t) => !assignedTagIds.has(t.id) && !pendingTagIds.has(t.id))
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [tags, assignedTagIds, pendingTagIds, debouncedTagSearch])

  const selectedRestaurant = useMemo(
    () => restaurants.find((r) => r.id === selectedRestaurantId),
    [restaurants, selectedRestaurantId],
  )
  const selectedOffer = useMemo(
    () => offers.find((o) => o.id === selectedOfferId),
    [offers, selectedOfferId],
  )

  // ── Handlers ──────────────────────────────────────────────────────────────

  const togglePendingTag = useCallback((tagId: string) => {
    setPendingTagIds((prev) => {
      const next = new Set(prev)
      next.has(tagId) ? next.delete(tagId) : next.add(tagId)
      return next
    })
  }, [])

  const removePendingTag = useCallback((tagId: string) => {
    setPendingTagIds((prev) => { const next = new Set(prev); next.delete(tagId); return next })
  }, [])

  const handleAssignAll = useCallback(() => {
    if (!selectedOfferId || pendingTagIds.size === 0) return
    pendingTagIds.forEach((tagId) => onAssign(tagId, selectedOfferId))
    onOpenChange(false)
  }, [selectedOfferId, pendingTagIds, onAssign, onOpenChange])

  const canAssign = !!selectedOfferId && pendingTagIds.size > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        max-h + flex column layout:
        - DialogContent fills up to 90vh
        - Header stays fixed at top
        - Middle scrolls
        - Footer (with Assign btn) always visible at bottom
      */}
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">

        {/* ── Fixed header ─────────────────────────────────────────────── */}
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-foreground">Assign Tags to Offer</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select a restaurant and offer, then pick one or more tags to assign.
          </DialogDescription>
        </DialogHeader>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col gap-4 py-2">

            {/* Step 1 — Restaurant */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Store className="h-3.5 w-3.5 text-muted-foreground" />
                Restaurant
              </label>
              <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a restaurant..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {sortedRestaurants.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {/* Step 2 — Offer */}
            {selectedRestaurantId && (
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground" />
                  Offer
                </label>
                {restaurantOffers.length === 0 ? (
                  <p className="rounded-md border border-border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
                    No active offers for {selectedRestaurant?.name ?? "this restaurant"}.
                  </p>
                ) : (
                  <Select value={selectedOfferId} onValueChange={setSelectedOfferId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an offer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {restaurantOffers.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Step 3 — Tags */}
            {selectedOfferId && (
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  Tags
                </label>

                {assignedTags.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">Already assigned ({assignedTags.length}):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedTags.map((t) => (
                        <Badge key={t.id} variant="secondary" className="gap-1 bg-muted text-muted-foreground">
                          <Check className="h-3 w-3" />{t.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {pendingTags.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-foreground">Selected to assign ({pendingTags.length}):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {pendingTags.map((t) => (
                        <Badge key={t.id} variant="secondary"
                          className="gap-1 border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10">
                          {t.name}
                          <button
                            onClick={() => removePendingTag(t.id)}
                            className="ml-0.5 rounded-full hover:bg-destructive/20"
                            aria-label={`Remove ${t.name} from selection`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search available tags..."
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    className="pl-9"
                  />
                  {tagSearch && (
                    <button
                      onClick={() => setTagSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Tag list — fixed height so it doesn't push footer off screen */}
                <ScrollArea className="h-[160px] rounded-md border border-border">
                  <div className="flex flex-col">
                    {availableTags.length === 0 ? (
                      <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                        {tagSearch ? "No matching tags available." : "All tags are already assigned to this offer."}
                      </p>
                    ) : (
                      availableTags.map((tag) => {
                        const isChecked = pendingTagIds.has(tag.id)
                        return (
                          <button
                            key={tag.id}
                            onClick={() => togglePendingTag(tag.id)}
                            className={`flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/80 ${
                              isChecked ? "bg-destructive/5 text-foreground" : "text-foreground"
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => togglePendingTag(tag.id)}
                              className="pointer-events-none"
                              aria-hidden
                            />
                            <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{tag.name}</span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>

        {/* ── Fixed footer — always visible ─────────────────────────────── */}
        <div className="shrink-0 space-y-3 pt-2">
          {canAssign && (
            <div className="rounded-md border border-border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
              Assign{" "}
              <span className="font-medium text-foreground">{pendingTagIds.size} tag{pendingTagIds.size > 1 ? "s" : ""}</span>{" "}
              to <span className="font-medium text-foreground">{selectedOffer?.title}</span>{" "}
              by <span className="font-medium text-foreground">{selectedRestaurant?.name}</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button
              onClick={handleAssignAll}
              disabled={!canAssign}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Assign {pendingTagIds.size > 0 ? `${pendingTagIds.size} Tag${pendingTagIds.size > 1 ? "s" : ""}` : "Tags"}
            </Button>
          </DialogFooter>
        </div>

      </DialogContent>
    </Dialog>
  )
}