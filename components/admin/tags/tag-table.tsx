"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Search, Plus, Tag as TagIcon, Pencil, Trash2, ChevronDown, ChevronRight, X, Link2, Loader2 } from "lucide-react"
import { TagFormDialog, DeleteConfirmDialog } from "./tag-dialogs"
import { AssignTagDialog } from "./assign-tag-dialog"
import { Unlink } from "lucide-react"
import { RemoveFromOfferDialog } from "./tag-dialogs"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TagLinkedOffer {
  offerId: string; offerTitle: string; offerStatus: "active" | "inactive" | "expired"
  startDate: string | null; expiryDate: string | null
  restaurantId: string; restaurantName: string; restaurantCity: string; restaurantStatus: string
}

export interface Tag {
  id: string; name: string; createdAt: string
  activeOfferCount: number; inactiveOfferCount: number; expiredOfferCount: number
  totalOfferCount: number; restaurantCount: number; linkedOffers: TagLinkedOffer[]
}

export interface Restaurant {
  id: string
  name: string
  status: string
  activeOffersCount: number
  totalOffersCount: number
  tagCount: number
}
export interface Offer { id: string; restaurantId: string; title: string; status: "active" | "inactive" | "expired"; tags: string[] }
export interface TagOfferAssociation { tagId: string; offerId: string }
export type SortOption = "name-asc" | "name-desc" | "offers-desc" | "offers-asc" | "newest" | "oldest"

// ─── Props ────────────────────────────────────────────────────────────────────

interface TagTableProps {
  tags: Tag[]; associations: TagOfferAssociation[]; restaurants: Restaurant[]; offers: Offer[]
  totalTags: number; hasMore: boolean; isLoadingMore: boolean; onLoadMore: () => void
  search: string; sort: SortOption
  onSearchChange: (v: string) => void; onSortChange: (v: SortOption) => void
  onAddTag: (name: string) => void; onEditTag: (id: string, name: string) => void
  onDeleteTag: (id: string) => void; onBulkDelete: (ids: string[]) => void
  onAssignTag: (tagId: string, offerId: string) => void
  onRemoveAssociation: (tagId: string, offerId: string) => void
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TagTable({
  tags, associations, restaurants, offers,
  totalTags, hasMore, isLoadingMore, onLoadMore,
  search, sort, onSearchChange, onSortChange,
  onAddTag, onEditTag, onDeleteTag, onBulkDelete, onAssignTag, onRemoveAssociation,
}: TagTableProps) {
  const [expandedRows, setExpandedRows]     = useState<Set<string>>(new Set())
  const [selectedRows, setSelectedRows]     = useState<Set<string>>(new Set())
  const [addDialogOpen, setAddDialogOpen]   = useState(false)
  const [editDialog, setEditDialog]         = useState<{ open: boolean; tag: Tag | null }>({ open: false, tag: null })
  const [deleteDialog, setDeleteDialog]     = useState<{ open: boolean; tag: Tag | null }>({ open: false, tag: null })
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)

  // IntersectionObserver-based infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || isLoadingMore) return
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) onLoadMore() }, { threshold: 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, isLoadingMore, onLoadMore])

  const allSelected  = tags.length > 0 && tags.every((t) => selectedRows.has(t.id))
  const someSelected = tags.some((t) => selectedRows.has(t.id))

  const toggleSelectAll = useCallback(() => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (allSelected) tags.forEach((t) => next.delete(t.id))
      else tags.forEach((t) => next.add(t.id))
      return next
    })
  }, [allSelected, tags])

  const toggleSelectRow = useCallback((id: string) => {
    setSelectedRows((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedRows((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }, [])

  return (
    <TooltipProvider>
      <Card className="border border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-foreground">Tag Management</CardTitle>
          <CardDescription>View and manage tags that restaurants use for search discoverability</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">

          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search tags..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-9" />
              {search && (
                <button onClick={() => onSearchChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
                <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="offers-desc">Most Offers</SelectItem>
                  <SelectItem value="offers-asc">Fewest Offers</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setAssignDialogOpen(true)} className="gap-2">
                <Link2 className="h-4 w-4" />Assign Tag
              </Button>
              <Button onClick={() => setAddDialogOpen(true)} className="gap-2 bg-destructive text-white hover:bg-destructive/90">
                <Plus className="h-4 w-4" />Add Tag
              </Button>
            </div>
          </div>

          {/* Count */}
          {/* <p className="text-sm text-muted-foreground">
            {search
              ? `${totalTags} tag${totalTags !== 1 ? "s" : ""} found for "${search}"`
              : `${totalTags} tag${totalTags !== 1 ? "s" : ""} total · showing ${tags.length}`}
          </p> */}

          {/* Table */}
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[44px]">
                    <Checkbox checked={allSelected ? true : someSelected ? "indeterminate" : false} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tag Name</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Linked Offers</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</TableHead>
                  <TableHead className="w-[100px] text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.length === 0 && !isLoadingMore ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      {search ? "No tags found matching your search." : "No tags yet. Click \"Add Tag\" to create one."}
                    </TableCell>
                  </TableRow>
                ) : (
                  tags.map((tag) => (
                    <TagTableRow
                      key={tag.id} tag={tag}
                      isExpanded={expandedRows.has(tag.id)} isSelected={selectedRows.has(tag.id)}
                      onToggleExpand={() => toggleExpand(tag.id)} onToggleSelect={() => toggleSelectRow(tag.id)}
                      onEdit={() => setEditDialog({ open: true, tag })} onDelete={() => setDeleteDialog({ open: true, tag })}
                      onRemoveAssociation={onRemoveAssociation}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Sentinel for IntersectionObserver */}
          <div ref={sentinelRef} className="h-1" />

          {isLoadingMore && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />Loading more tags…
            </div>
          )}
          {!hasMore && tags.length > 0 && (
            <p className="py-1 text-center text-xs text-muted-foreground">All {totalTags} tags loaded</p>
          )}
        </CardContent>
      </Card>

      {/* Bulk bar */}
      {selectedRows.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg border border-border bg-card px-5 py-3 shadow-lg">
          <span className="text-sm font-medium text-foreground">{selectedRows.size} tag{selectedRows.size !== 1 ? "s" : ""} selected</span>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />Delete Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedRows(new Set())}>Clear</Button>
        </div>
      )}

      {/* Dialogs */}
      <TagFormDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} mode="add" onSave={onAddTag} />
      {editDialog.tag && (
        <TagFormDialog
          open={editDialog.open} onOpenChange={(open) => setEditDialog((p) => ({ ...p, open }))}
          mode="edit" initialName={editDialog.tag.name}
          onSave={(name) => { onEditTag(editDialog.tag!.id, name); setEditDialog({ open: false, tag: null }) }}
        />
      )}
      {deleteDialog.tag && (
        <DeleteConfirmDialog
          open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog((p) => ({ ...p, open }))}
          tagName={deleteDialog.tag.name}
          onConfirm={() => {
            onDeleteTag(deleteDialog.tag!.id)
            setSelectedRows((p) => { const n = new Set(p); n.delete(deleteDialog.tag!.id); return n })
            setDeleteDialog({ open: false, tag: null })
          }}
        />
      )}
      <DeleteConfirmDialog
        open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen} tagName="" count={selectedRows.size}
        onConfirm={() => { onBulkDelete(Array.from(selectedRows)); setSelectedRows(new Set()); setBulkDeleteOpen(false) }}
      />
      <AssignTagDialog
        open={assignDialogOpen} onOpenChange={setAssignDialogOpen}
        tags={tags} restaurants={restaurants} offers={offers} associations={associations} onAssign={onAssignTag}
      />
    </TooltipProvider>
  )
}

// ─── Tag Table Row ────────────────────────────────────────────────────────────

function TagTableRow({
  tag, isExpanded, isSelected, onToggleExpand, onToggleSelect, onEdit, onDelete, onRemoveAssociation,
}: {
  tag: Tag; isExpanded: boolean; isSelected: boolean
  onToggleExpand: () => void; onToggleSelect: () => void
  onEdit: () => void; onDelete: () => void
  onRemoveAssociation: (tagId: string, offerId: string) => void
}) {
  return (
    <>
      <TableRow className={`group transition-colors ${isSelected ? "bg-destructive/5" : ""} ${isExpanded ? "border-b-0" : ""}`}>
        <TableCell>
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} aria-label={`Select ${tag.name}`} />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <TagIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{tag.name.charAt(0).toUpperCase() + tag.name.slice(1)}</span>
          </div>
        </TableCell>
        <TableCell>
          <button
            onClick={onToggleExpand}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted"
            aria-expanded={isExpanded}
          >
            <Badge variant="secondary" className="gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">{tag.activeOfferCount} active</Badge>
            {tag.expiredOfferCount > 0 && (
              <Badge variant="secondary" className="gap-1 bg-muted text-muted-foreground hover:bg-muted">{tag.expiredOfferCount} expired</Badge>
            )}
            {(tag.totalOfferCount - tag.activeOfferCount - tag.expiredOfferCount) > 0 && (
              <Badge variant="secondary" className="gap-1 bg-blue-50 text-blue-700 hover:bg-blue-50">
                {tag.totalOfferCount - tag.activeOfferCount - tag.expiredOfferCount} inactive
              </Badge>
            )}
            {tag.totalOfferCount > 0 && (
              isExpanded
                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">{tag.createdAt}</TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onEdit}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit tag</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete tag</TooltipContent>
            </Tooltip>
          </div>
        </TableCell>
      </TableRow>

      {isExpanded && tag.totalOfferCount > 0 && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5} className="p-0">
            <InlineExpandedOffers tagId={tag.id} tagName={tag.name} linkedOffers={tag.linkedOffers} onRemoveAssociation={onRemoveAssociation} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ─── Inline Expanded Offers ───────────────────────────────────────────────────

function InlineExpandedOffers({
  tagId, tagName, linkedOffers, onRemoveAssociation,
}: {
  tagId: string; tagName: string; linkedOffers: TagLinkedOffer[]
  onRemoveAssociation: (tagId: string, offerId: string) => void
}) {
  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; offer: TagLinkedOffer | null }>({ open: false, offer: null })

  if (linkedOffers.length === 0) {
    return <div className="px-10 py-4 text-sm text-muted-foreground">No offers are currently associated with this tag.</div>
  }

  // const sorted = [...linkedOffers].sort((a, b) => {
  //   if (a.offerStatus === "active" && b.offerStatus !== "active") return -1
  //   if (a.offerStatus !== "active" && b.offerStatus === "active") return 1
  //   return a.restaurantName.localeCompare(b.restaurantName)
  // })

  const sorted = [...linkedOffers].sort((a, b) => {
  if (a.offerStatus === "active" && b.offerStatus !== "active") return -1
  if (a.offerStatus !== "active" && b.offerStatus === "active") return 1
  return (a.restaurantName || "").localeCompare(b.restaurantName || "")
})

  return (
    <>
      <div className="bg-muted/40 px-10 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Offers tagged with &ldquo;{tagName}&rdquo; ({linkedOffers.length})
        </p>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground">Restaurant</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Offer</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="w-[100px] text-right text-xs font-medium text-muted-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((offer) => (
                <TableRow key={offer.offerId} className={offer.offerStatus === "expired" ? "opacity-50" : ""}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{offer.restaurantName}</span>
                      {offer.restaurantCity && <span className="text-xs text-muted-foreground">{offer.restaurantCity}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{offer.offerTitle}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={
                      offer.offerStatus === "active" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                      : offer.offerStatus === "inactive" ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                      : "bg-muted text-muted-foreground hover:bg-muted"
                    }>
                      {offer.offerStatus === "active" ? "Active" : offer.offerStatus === "inactive" ? "Inactive" : "Expired"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setRemoveDialog({ open: true, offer })}>
                      <Unlink className="h-3.5 w-3.5" />Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {removeDialog.offer && (
        <RemoveFromOfferDialog
          open={removeDialog.open} onOpenChange={(open) => setRemoveDialog((p) => ({ ...p, open }))}
          tagName={tagName} offerTitle={removeDialog.offer.offerTitle} restaurantName={removeDialog.offer.restaurantName}
          onConfirm={() => { onRemoveAssociation(tagId, removeDialog.offer!.offerId); setRemoveDialog({ open: false, offer: null }) }}
        />
      )}
    </>
  )
}