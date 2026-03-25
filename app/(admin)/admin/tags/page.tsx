"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import { StatsCards } from "@/components/admin/tags/stats-cards"
import {
  TagTable,
  type Tag, type Restaurant, type Offer,
  type TagOfferAssociation, type TagLinkedOffer, type SortOption,
} from "@/components/admin/tags/tag-table"
import { RestaurantBrowser, type RestaurantSortBy } from "@/components/admin/tags/restaurant-browser"

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.message || "API error")
  return data
}

function mapTagFromServer(t: any): Tag {
  return {
    id: String(t._id),
    name: t.name,
    createdAt: new Date(t.createdAt).toLocaleDateString("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric",
    }),
    activeOfferCount: t.activeOfferCount ?? 0,
    inactiveOfferCount: t.inactiveOfferCount ?? 0,
    expiredOfferCount: t.expiredOfferCount ?? 0,
    totalOfferCount: t.totalOfferCount ?? 0,
    restaurantCount: t.restaurantCount ?? 0,
    linkedOffers: (t.offers || []).map((o: any): TagLinkedOffer => ({
      offerId: String(o.offerId),
      offerTitle: o.offerTitle,
      offerStatus: o.offerStatus,
      startDate: o.startDate ?? null,
      expiryDate: o.expiryDate ?? null,
      restaurantId: o.restaurantId,
      restaurantName: o.restaurantName,
      restaurantCity: o.restaurantCity ?? "",
      restaurantStatus: o.restaurantStatus ?? "unknown",
    })),
  }
}

const PAGE_SIZE = 60
const REST_PAGE_SIZE = 50

interface GlobalStats {
  totalTags: number
  tagsWithRestaurants: number
  totalAssociations: number
  avgPerTag: string
}

export default function TagsPage() {
  // ── Tags ───────────────────────────────────────────────────────────────────
  const [tags, setTags] = useState<Tag[]>([])
  const [totalTags, setTotalTags] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalTags: 0, tagsWithRestaurants: 0, totalAssociations: 0, avgPerTag: "0",
  })

  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortOption>("name-asc")

  const [debouncedSearch, setDebouncedSearch] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  // ── Tags prefetch refs ─────────────────────────────────────────────────────
  const tagPrefetchRef = useRef(false)
  const tagLoadingRef = useRef(false)

  // ── Restaurants ────────────────────────────────────────────────────────────
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [restaurantPage, setRestaurantPage] = useState(1)
  const [restaurantHasMore, setRestaurantHasMore] = useState(false)
  const [restaurantLoading, setRestaurantLoading] = useState(false)
  const [restaurantTotal, setRestaurantTotal] = useState(0)
  const [restaurantSort, setRestaurantSort] = useState<RestaurantSortBy>("tags-desc")

  const [restaurantSearch, setRestaurantSearch] = useState("")
  const [debouncedRestaurantSearch, setDebouncedRestaurantSearch] = useState("")
  const restDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (restDebounceRef.current) clearTimeout(restDebounceRef.current)
    restDebounceRef.current = setTimeout(() => setDebouncedRestaurantSearch(restaurantSearch), 300)
    return () => { if (restDebounceRef.current) clearTimeout(restDebounceRef.current) }
  }, [restaurantSearch])

  const restaurantLoadingRef = useRef(false)
  const restaurantPrefetchRef = useRef(false)

  // ── Other ──────────────────────────────────────────────────────────────────
  const [offers, setOffers] = useState<Offer[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"tags" | "restaurants">("tags")

  const applyStatsFromResponse = useCallback((res: any) => {
    if (res.stats) setGlobalStats(res.stats)
  }, [])

  // ── Tag fetching ───────────────────────────────────────────────────────────

  const fetchTagPage = useCallback(async (
    page: number,
    replace: boolean,
    searchOverride?: string,
    sortOverride?: SortOption,
  ) => {
    if (tagLoadingRef.current) return
    tagLoadingRef.current = true
    setIsLoadingMore(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        search: searchOverride ?? debouncedSearch,
        sort: sortOverride ?? sort,
      })
      const res = await apiFetch(`/api/admin/new-tags?${params}`)
      const mapped = (res.data || []).map(mapTagFromServer)
      setTags((prev) => replace ? mapped : [...prev, ...mapped])
      setTotalTags(res.pagination?.total ?? mapped.length)
      setHasMore(res.pagination?.hasMore ?? false)
      setCurrentPage(page)
      applyStatsFromResponse(res)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load tags")
    } finally {
      tagLoadingRef.current = false
      setIsLoadingMore(false)
    }
  }, [debouncedSearch, sort, applyStatsFromResponse])

  // ── Tags background prefetch ───────────────────────────────────────────────
  const prefetchAllTags = useCallback(async (
    searchOverride?: string,
    sortOverride?: SortOption,
  ) => {
    if (tagPrefetchRef.current || (searchOverride ?? debouncedSearch)) return
    tagPrefetchRef.current = true

    let nextPage = 2
    let hasMorePages = true

    while (hasMorePages) {
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: String(PAGE_SIZE),
          search: "",
          sort: sortOverride ?? sort,
        })
        const res = await apiFetch(`/api/admin/new-tags?${params}`)
        const mapped = (res.data || []).map(mapTagFromServer)

        setTags((prev) => {
          const map = new Map(prev.map((t) => [t.id, t]))
          for (const t of mapped) map.set(t.id, t)
          return Array.from(map.values())
        })

        const page = res.pagination?.page ?? nextPage
        const pages = res.pagination?.pages ?? 1
        hasMorePages = page < pages
        nextPage++

        applyStatsFromResponse(res)
        await new Promise((r) => setTimeout(r, 150))
      } catch (err) {
        console.error("Tag prefetch failed", err)
        break
      }
    }

    setHasMore(false)
  }, [debouncedSearch, sort, applyStatsFromResponse])

  // ── Restaurant fetching ────────────────────────────────────────────────────

  const fetchRestaurantPage = useCallback(async (
    page: number,
    replace: boolean,
    searchOverride?: string,
    sortOverride?: RestaurantSortBy,
  ) => {
    if (restaurantLoadingRef.current) return
    restaurantLoadingRef.current = true
    setRestaurantLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(REST_PAGE_SIZE),
        search: searchOverride ?? debouncedRestaurantSearch,
        sort: sortOverride ?? restaurantSort,
      })
      const res = await apiFetch(`/api/admin/new-tags/restaurants?${params}`)
      const mapped = (res.data || res.restaurants || []).map((r: any) => ({
        id: String(r._id),
        name: r.name,
        status: r.status,
        activeOffersCount: r.activeOffersCount ?? 0,   // ✅ ADD
        totalOffersCount: r.totalOffersCount ?? 0,     // ✅ ADD
        tagCount: r.tagCount ?? 0,                     // ✅ ADD
      }))
      setRestaurants((prev) => replace ? mapped : [...prev, ...mapped])
      setRestaurantHasMore(res.pagination?.hasMore ?? false)
      setRestaurantTotal(res.pagination?.total ?? mapped.length)
      setRestaurantPage(page)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load restaurants")
    } finally {
      restaurantLoadingRef.current = false
      setRestaurantLoading(false)
    }
  }, [debouncedRestaurantSearch, restaurantSort])

  const prefetchAllRestaurants = useCallback(async () => {
    if (restaurantPrefetchRef.current || debouncedRestaurantSearch) return
    restaurantPrefetchRef.current = true
    let nextPage = 2
    let hasMorePages = true
    while (hasMorePages) {
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: String(REST_PAGE_SIZE),
          search: "",
          sort: restaurantSort,
        })
        const res = await apiFetch(`/api/admin/new-tags/restaurants?${params}`)
        const mapped = (res.data || res.restaurants || []).map((r: any) => ({
          id: String(r._id),
          name: r.name,
          status: r.status,
          activeOffersCount: r.activeOffersCount ?? 0,
          totalOffersCount: r.totalOffersCount ?? 0,
          tagCount: r.tagCount ?? 0,
        }))
        setRestaurants((prev) => {
          const map = new Map(prev.map((r) => [r.id, r]))
          for (const r of mapped) map.set(r.id, r)
          return Array.from(map.values())
        })
        const page = res.pagination?.page ?? nextPage
        const pages = res.pagination?.pages ?? 1
        hasMorePages = page < pages
        nextPage++
        await new Promise((r) => setTimeout(r, 150))
      } catch (err) {
        console.error("Restaurant prefetch failed", err)
        break
      }
    }
    setRestaurantHasMore(false)
  }, [debouncedRestaurantSearch, restaurantSort])

  // ── Re-fetch restaurants on search change ─────────────────────────────────
  const isFirstRestaurantRun = useRef(true)
  useEffect(() => {
    if (isFirstRestaurantRun.current) { isFirstRestaurantRun.current = false; return }
    restaurantPrefetchRef.current = false
    setRestaurants([])
    fetchRestaurantPage(1, true, debouncedRestaurantSearch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedRestaurantSearch])

  // ── Re-fetch restaurants on sort change ───────────────────────────────────
  const isFirstRestSortRun = useRef(true)
  useEffect(() => {
    if (isFirstRestSortRun.current) { isFirstRestSortRun.current = false; return }
    restaurantPrefetchRef.current = false
    setRestaurants([])
    fetchRestaurantPage(1, true, debouncedRestaurantSearch, restaurantSort)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantSort])

  // ── Re-fetch tags on search / sort change ──────────────────────────────────
  const isFirstRun = useRef(true)
  useEffect(() => {
    if (isFirstRun.current) return
    tagPrefetchRef.current = false
    setTags([])
    fetchTagPage(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sort])

  // ── Initial parallel load ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setInitialLoading(true)
    Promise.all([
      apiFetch(`/api/admin/new-tags?page=1&limit=${PAGE_SIZE}&search=&sort=name-asc`),
      apiFetch(`/api/admin/new-tags/restaurants?page=1&limit=${REST_PAGE_SIZE}&search=&sort=tags-desc`),
      apiFetch("/api/admin/new-tags/offers"),
    ])
      .then(([tagsRes, restaurantsRes, offersRes]) => {
        if (cancelled) return

        const mappedTags = (tagsRes.data || []).map(mapTagFromServer)
        setTags(mappedTags)
        setTotalTags(tagsRes.pagination?.total ?? mappedTags.length)
        setHasMore(tagsRes.pagination?.hasMore ?? false)
        setCurrentPage(1)
        if (tagsRes.stats) setGlobalStats(tagsRes.stats)

        const mappedRests = (restaurantsRes.data || restaurantsRes.restaurants || []).map((r: any) => ({
          id: String(r._id),
          name: r.name,
          status: r.status,
          activeOffersCount: r.activeOffersCount ?? 0,
          totalOffersCount: r.totalOffersCount ?? 0,
          tagCount: r.tagCount ?? 0,
        }))
        setRestaurants(mappedRests)
        setRestaurantHasMore(restaurantsRes.pagination?.hasMore ?? false)
        setRestaurantTotal(restaurantsRes.pagination?.total ?? mappedRests.length)
        setRestaurantPage(1)

        setOffers(
          offersRes.data.map((o: any) => ({
            id: String(o._id), restaurantId: String(o.restaurantId), title: o.title,
            status: o.status === "active" ? "active" : o.status === "inactive" ? "inactive" : "expired",
            tags: (o.tags || []).map(String),
          }))
        )

        setTimeout(() => {
          prefetchAllTags()
          prefetchAllRestaurants()
        }, 500)
      })
      .catch((err) => { if (!cancelled) { console.error(err); toast.error("Failed to load data") } })
      .finally(() => {
        if (!cancelled) {
          setInitialLoading(false)
          isFirstRun.current = false
        }
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load more (manual fallback) ────────────────────────────────────────────

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return
    fetchTagPage(currentPage + 1, false)
  }, [hasMore, isLoadingMore, currentPage, fetchTagPage])

  const loadMoreRestaurants = useCallback(() => {
    if (!restaurantHasMore || restaurantLoading) return
    fetchRestaurantPage(restaurantPage + 1, false)
  }, [restaurantHasMore, restaurantLoading, restaurantPage, fetchRestaurantPage])

  // ── Refresh tags — page 1 fetch + baaki pages bhi background mein ─────────

  const refreshTags = useCallback(async () => {
    setIsLoadingMore(true)
    try {
      const params = new URLSearchParams({
        page: "1", limit: String(PAGE_SIZE),
        search: debouncedSearch, sort,
      })
      const res = await apiFetch(`/api/admin/new-tags?${params}`)
      const mapped = (res.data || []).map(mapTagFromServer)
      setTags(mapped)
      setTotalTags(res.pagination?.total ?? mapped.length)
      setHasMore(res.pagination?.hasMore ?? false)
      setCurrentPage(1)
      applyStatsFromResponse(res)

      // ✅ FIX: page 1 ke baad baki pages bhi background mein fetch karo
      if (!debouncedSearch) {
        tagPrefetchRef.current = false
        setTimeout(() => prefetchAllTags(), 300)
      }
    } catch { /* silent */ }
    finally { setIsLoadingMore(false) }
  }, [debouncedSearch, sort, applyStatsFromResponse, prefetchAllTags])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const handleAddTag = useCallback(async (name: string) => {
    try {
      const res = await apiFetch("/api/admin/new-tags", { method: "POST", body: JSON.stringify({ name }) })
      const newTag = mapTagFromServer(res.data)
      setTags((prev) => [newTag, ...prev])
      setTotalTags((n) => n + 1)
      setGlobalStats((prev) => ({ ...prev, totalTags: prev.totalTags + 1 }))
      toast.success(`Tag "${name}" created`)
    } catch (err: any) { toast.error(err.message || "Failed to create tag") }
  }, [])

  const handleEditTag = useCallback(async (id: string, name: string) => {
    try {
      await apiFetch(`/api/admin/new-tags/${id}`, { method: "PUT", body: JSON.stringify({ name }) })
      setTags((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)))
      toast.success("Tag updated")
    } catch (err: any) { toast.error(err.message || "Failed to update tag") }
  }, [])

  const handleDeleteTag = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/admin/new-tags/${id}`, { method: "DELETE" })
      setTags((prev) => prev.filter((t) => t.id !== id))
      setTotalTags((n) => Math.max(0, n - 1))
      setGlobalStats((prev) => ({ ...prev, totalTags: Math.max(0, prev.totalTags - 1) }))
      setOffers((prev) => prev.map((o) => ({ ...o, tags: o.tags.filter((tid) => tid !== id) })))
      toast.success("Tag deleted")
    } catch (err: any) { toast.error(err.message || "Failed to delete tag") }
  }, [])

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    try {
      await apiFetch("/api/admin/new-tags/bulk-delete", { method: "POST", body: JSON.stringify({ ids }) })
      const idSet = new Set(ids)
      setTags((prev) => prev.filter((t) => !idSet.has(t.id)))
      setTotalTags((n) => Math.max(0, n - ids.length))
      setGlobalStats((prev) => ({ ...prev, totalTags: Math.max(0, prev.totalTags - ids.length) }))
      setOffers((prev) => prev.map((o) => ({ ...o, tags: o.tags.filter((tid) => !idSet.has(tid)) })))
      toast.success(`${ids.length} tags deleted`)
    } catch (err: any) { toast.error(err.message || "Failed to bulk delete") }
  }, [])

const handleAssignTag = useCallback(async (tagId: string, offerId: string) => {
  const offer = offers.find((o) => o.id === offerId)
  if (!offer || offer.tags.includes(tagId)) return

  // ✅ Optimistic update — offers
  setOffers((prev) => prev.map((o) =>
    o.id === offerId ? { ...o, tags: [...o.tags, tagId] } : o
  ))

  // ✅ Tag ki linkedOffers update
  setTags((prev) => prev.map((t) => {
    if (t.id !== tagId) return t
    if (t.linkedOffers.some((lo) => lo.offerId === offerId)) return t
    const restaurant = restaurants.find((r) => r.id === offer.restaurantId)
    return {
      ...t,
      linkedOffers: [...t.linkedOffers, {
        offerId, offerTitle: offer.title, offerStatus: offer.status,
        startDate: null, expiryDate: null,
        restaurantId: offer.restaurantId,
        restaurantName: restaurant?.name ?? "",
        restaurantCity: "", restaurantStatus: restaurant?.status ?? "unknown",
      }],
      totalOfferCount: t.totalOfferCount + 1,
      activeOfferCount: offer.status === "active" ? t.activeOfferCount + 1 : t.activeOfferCount,
    }
  }))

  // ✅ YEH ADD KARO — restaurant tagCount optimistically update karo
  setRestaurants((prev) => prev.map((r) => {
    if (r.id !== offer.restaurantId) return r
    // Check karo: kya yeh tag already kisi aur offer pe is restaurant mein hai?
    const alreadyHasTag = offers.some(
      (o) => o.id !== offerId && o.restaurantId === offer.restaurantId && o.tags.includes(tagId)
    )
    if (alreadyHasTag) return r  // same tag doosre offer pe already hai, count same rahega
    return { ...r, tagCount: r.tagCount + 1 }
  }))

  try {
    await apiFetch("/api/admin/new-tags/assign", { method: "POST", body: JSON.stringify({ tagId, offerId }) })
  } catch (err: any) {
    // Rollback — offers
    setOffers((prev) => prev.map((o) =>
      o.id === offerId ? { ...o, tags: o.tags.filter((tid) => tid !== tagId) } : o
    ))
    // Rollback — tags
    setTags((prev) => prev.map((t) =>
      t.id !== tagId ? t : {
        ...t,
        linkedOffers: t.linkedOffers.filter((lo) => lo.offerId !== offerId),
        totalOfferCount: Math.max(0, t.totalOfferCount - 1),
        activeOfferCount: offer.status === "active" ? Math.max(0, t.activeOfferCount - 1) : t.activeOfferCount,
      }
    ))
    // Rollback — restaurant tagCount
    setRestaurants((prev) => prev.map((r) => {
      if (r.id !== offer.restaurantId) return r
      const alreadyHasTag = offers.some(
        (o) => o.id !== offerId && o.restaurantId === offer.restaurantId && o.tags.includes(tagId)
      )
      if (alreadyHasTag) return r
      return { ...r, tagCount: Math.max(0, r.tagCount - 1) }
    }))
    toast.error(err.message || "Failed to assign tag")
  }
}, [offers, restaurants])

  const handleRemoveAssociation = useCallback(async (tagId: string, offerId: string) => {
    const offer = offers.find((o) => o.id === offerId)
    if (!offer) return
    setOffers((prev) => prev.map((o) => o.id === offerId ? { ...o, tags: o.tags.filter((tid) => tid !== tagId) } : o))
    setTags((prev) => prev.map((t) => t.id !== tagId ? t : {
      ...t,
      linkedOffers: t.linkedOffers.filter((lo) => lo.offerId !== offerId),
      totalOfferCount: Math.max(0, t.totalOfferCount - 1),
      activeOfferCount: offer.status === "active" ? Math.max(0, t.activeOfferCount - 1) : t.activeOfferCount,
      expiredOfferCount: offer.status === "expired" ? Math.max(0, t.expiredOfferCount - 1) : t.expiredOfferCount,
    }))
    setRestaurants((prev) => prev.map((r) => {
      if (r.id !== offer.restaurantId) return r
      // Check karo: kya yeh tag kisi aur offer pe bhi hai is restaurant mein?
      const stillHasTag = offers.some(
        (o) => o.id !== offerId && o.restaurantId === offer.restaurantId && o.tags.includes(tagId)
      )
      if (stillHasTag) return r  // doosre offer pe abhi bhi hai, count same
      return { ...r, tagCount: Math.max(0, r.tagCount - 1) }
    }))
    try {
      await apiFetch("/api/admin/new-tags/assign", { method: "DELETE", body: JSON.stringify({ tagId, offerId }) })
      toast.success("Tag removed from offer")
      await refreshTags() // ✅ refreshTags ab baki pages bhi fetch karti hai
    } catch (err: any) { await refreshTags(); toast.error(err.message || "Failed to remove tag") }
  }, [offers, refreshTags])

  // ── Derived ────────────────────────────────────────────────────────────────

  const associations: TagOfferAssociation[] = useMemo(() => {
    const acc: TagOfferAssociation[] = []
    offers.forEach((o) => o.tags.forEach((tagId) => acc.push({ tagId, offerId: o.id })))
    return acc
  }, [offers])

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (initialLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Manage Tags</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitor and control how restaurants tag their offers</p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-5">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border p-6">
            <div className="mb-1 h-5 w-36 animate-pulse rounded bg-muted" />
            <div className="h-3 w-72 animate-pulse rounded bg-muted" />
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="h-9 w-72 animate-pulse rounded-md bg-muted" />
              <div className="flex gap-3">
                <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
                <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
                <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
              </div>
            </div>
            <div className="overflow-hidden rounded-md border border-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3.5">
                  <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                  <div className={`h-3 animate-pulse rounded bg-muted ${i % 3 === 0 ? "w-24" : i % 3 === 1 ? "w-32" : "w-20"}`} />
                  <div className="ml-auto flex gap-2">
                    <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                    <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Manage Tags</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor and control how restaurants tag their offers</p>
      </div>

      <StatsCards
        totalTags={globalStats.totalTags}
        tagsWithRestaurants={globalStats.tagsWithRestaurants}
        totalAssociations={globalStats.totalAssociations}
        avgPerTag={globalStats.avgPerTag}
      />

      <div className="flex items-center gap-0 border-b border-border" role="tablist">
        {(["tags", "restaurants"] as const).map((tab) => (
          <button
            key={tab} role="tab" aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-5 py-3 text-sm font-semibold transition-colors ${activeTab === tab ? "text-destructive" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {tab === "tags" ? "Browse by Tag" : "Browse by Restaurant"}
            {activeTab === tab && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-destructive" />}
          </button>
        ))}
      </div>

      {activeTab === "tags" ? (
        <TagTable
          tags={tags} associations={associations} restaurants={restaurants} offers={offers}
          totalTags={totalTags} hasMore={hasMore} isLoadingMore={isLoadingMore} onLoadMore={handleLoadMore}
          search={search} sort={sort} onSearchChange={setSearch} onSortChange={setSort}
          onAddTag={handleAddTag} onEditTag={handleEditTag} onDeleteTag={handleDeleteTag}
          onBulkDelete={handleBulkDelete} onAssignTag={handleAssignTag} onRemoveAssociation={handleRemoveAssociation}
        />
      ) : (
        <RestaurantBrowser
          tags={tags} associations={associations} restaurants={restaurants} offers={offers}
          hasMoreRestaurants={restaurantHasMore}
          isLoadingRestaurants={restaurantLoading}
          totalRestaurants={restaurantTotal}
          restaurantSearch={restaurantSearch}
          onRestaurantSearchChange={setRestaurantSearch}
          onLoadMoreRestaurants={loadMoreRestaurants}
          onAssignTag={handleAssignTag}
          onRemoveAssociation={handleRemoveAssociation}
          sortBy={restaurantSort}
          onSortChange={setRestaurantSort}
        />
      )}
    </div>
  )
}