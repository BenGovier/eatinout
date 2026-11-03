// app/api/admin/restaurants/route.ts
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import supabaseAdmin from "@/lib/supabase/admin"
import { verifyAdminToken } from "@/lib/auth-admin"

// Supabase (PostgREST) returns max 1000 rows per request by default
const SUPABASE_PAGE_SIZE = 1000
// Max ids per .in() request (keeps the request URL short)
const ID_CHUNK = 100

const fetchAllRows = async (buildQuery: () => any) => {
  const rows: any[] = []
  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + SUPABASE_PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data || []))
    if ((data || []).length < SUPABASE_PAGE_SIZE) break
  }
  return rows
}

// Fetch rows whose `column` (default id) is in `ids`, in parallel chunks
const fetchByIds = async (
  table: string,
  columns: string,
  ids: string[],
  options: { column?: string; orderBy?: string; apply?: (q: any) => any } = {}
) => {
  const { column = "id", orderBy = "id", apply } = options
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    chunks.push(ids.slice(i, i + ID_CHUNK))
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      fetchAllRows(() => {
        let q: any = supabaseAdmin.from(table).select(columns).in(column, chunk)
        if (apply) q = apply(q)
        return q.order(orderBy, { ascending: true })
      })
    )
  )
  const rows: any[] = []
  for (const r of results) rows.push(...r)
  return rows
}

const RESTAURANT_DOC_SELECT = `
  id, name, slug, description, address, city, zip_code, phone, email, website, user_id, status,
  dine_in, dine_out, delivery_available, associated_id, address_link, is_hidden,
  subscription_status, stripe_customer_id, lat, lng,
  home_is_pinned, home_pin_priority, home_pinned_at, created_at, updated_at,
  restaurant_areas(area_id),
  restaurant_categories(category_id),
  restaurant_tags(tag_id),
  restaurant_images(image_url, display_order),
  restaurant_menu_pdfs(pdf_url, display_order),
  restaurant_area_pins(area_id, is_pinned, priority, pinned_at)
`

const mapRestaurantDoc = (r: any) => ({
  _id: r.id as string,
  name: r.name,
  slug: r.slug,
  description: r.description,
  address: r.address,
  city: r.city,
  zipCode: r.zip_code,
  area: (r.restaurant_areas || []).map((ra: any) => ra.area_id) as string[],
  phone: r.phone,
  email: r.email,
  website: r.website,
  userId: r.user_id as string | null,
  images: (r.restaurant_images || [])
    .slice()
    .sort((a: any, b: any) => a.display_order - b.display_order)
    .map((i: any) => i.image_url) as string[],
  status: r.status as string,
  dineIn: r.dine_in,
  dineOut: r.dine_out,
  deliveryAvailable: r.delivery_available,
  category: (r.restaurant_categories || []).map((rc: any) => rc.category_id) as string[],
  associatedId: r.associated_id as string | null,
  addressLink: r.address_link,
  menuPdfUrls: (r.restaurant_menu_pdfs || [])
    .slice()
    .sort((a: any, b: any) => a.display_order - b.display_order)
    .map((p: any) => p.pdf_url) as string[],
  hidden: r.is_hidden,
  subscriptionStatus: r.subscription_status,
  stripeCustomerId: r.stripe_customer_id,
  homePin: {
    isPinned: r.home_is_pinned,
    priority: r.home_pin_priority,
    pinnedAt: r.home_pinned_at,
  },
  areaPins: (r.restaurant_area_pins || []).map((p: any) => ({
    areaId: p.area_id,
    isPinned: p.is_pinned,
    priority: p.priority,
    areaPinnedAt: p.pinned_at,
  })),
  searchTags: (r.restaurant_tags || []).map((t: any) => t.tag_id) as string[],
  lat: r.lat,
  lng: r.lng,
  ...(r.lat != null && r.lng != null
    ? { location: { type: "Point", coordinates: [r.lng, r.lat] } }
    : {}),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const getRestaurantDocById = async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from("restaurants")
    .select(RESTAURANT_DOC_SELECT)
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapRestaurantDoc(data) : null
}

// Supabase helpers
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => "\\" + m)
const countOf = async (query: PromiseLike<{ count: number | null; error: any }>) => {
  const { count, error } = await query
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const isExport = searchParams.get('export') === 'true'
    const skip = isExport ? 0 : (page - 1) * limit

    // Modify limit for export
    const exportLimit = isExport ? 10000 : limit

    // Dynamic filtering parameters
    const searchTerm = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status') || ''
    const areaFilter = searchParams.get('area') || ''

    // Build dynamic query
    const query: any = {}

    // Exclude hidden restaurants by default
    query.hidden = false

    if (searchTerm) {
      query.search = searchTerm
      const { data: matchingCategories, error: matchingCategoriesError } = await supabaseAdmin
        .from("categories")
        .select("id")
        .ilike("name", `%${escapeLike(searchTerm)}%`)
      if (matchingCategoriesError) throw new Error(matchingCategoriesError.message)
      query.categoryIds = (matchingCategories || []).map((c: any) => c.id)
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      query.status = statusFilter
    }

    // Area filter
    if (areaFilter && areaFilter !== 'all') {
      // Find the area by name
      const { data: areaRow, error: areaError } = await supabaseAdmin
        .from("areas")
        .select("id, name")
        .eq("name", areaFilter)
        .limit(1)
        .maybeSingle()
      if (areaError) throw new Error(areaError.message)
      const area = areaRow && { _id: areaRow.id, name: areaRow.name }

      console.log('Area Filter Details:', {
        areaFilter,
        areaFound: area,
        areaId: area ? area._id : null
      })

      if (area) {
        // Convert ObjectId to string for matching
        const areaIdString = area._id.toString()

        // Use $in to match any area in the restaurant's areas array
        query.areaId = areaIdString
      }
    }

    console.log('Final Query:', query)

    // Lightweight list of every matching restaurant (id + sort fields); the page is cut out of it below
    const matchingRows = await fetchAllRows(() => {
      let q: any = supabaseAdmin
        .from("restaurants")
        .select(
          "id, name, created_at, home_is_pinned, home_pin_priority, restaurant_area_pins(priority), restaurant_categories(category_id)" +
            (query.areaId ? ", restaurant_areas!inner(area_id)" : "")
        )
        .eq("is_hidden", query.hidden)
      if (query.status) q = q.eq("status", query.status)
      if (query.areaId) q = q.eq("restaurant_areas.area_id", query.areaId)
      return q.order("id", { ascending: true })
    })
    const searchLower = searchTerm.toLowerCase()
    const filteredRows = matchingRows.filter((r: any) => {
      if (!query.search) return true
      return (
        String(r.name || "").toLowerCase().includes(searchLower) ||
        (r.restaurant_categories || []).some((rc: any) => query.categoryIds.includes(rc.category_id))
      )
    })

    const totalRestaurants = filteredRows.length

    const totalPages = Math.ceil(totalRestaurants / limit)

    // const restaurants = await Restaurant.find(query)
    //   // .sort({ createdAt: -1 })
    //   .sort({
    //     "homePin.isPinned": -1,      // pinned first
    //     "homePin.priority": 1,       // 1 > 2 > 3
    //     "homePin.pinnedAt": -1,       // older first
    //     createdAt: -1                // fallback
    //   })
    //   .skip(skip)
    //   .limit(exportLimit)
    //   .populate('area', 'name')
    //   .lean() // Optimize: Return plain JavaScript objects instead of Mongoose documents  

    // Computed sort fields + sort logic (same as the old aggregation), then skip/limit
    const sortedRows = filteredRows
      .map((r: any) => {
        const pinPriorities = (r.restaurant_area_pins || [])
          .map((p: any) => p.priority)
          .filter((p: any) => p != null)
        return {
          id: r.id,
          created_at: r.created_at,
          /** ✅ COMPUTED SORT FIELDS */
          isHomePinned: r.home_is_pinned ? 1 : 0,
          homePriority: r.home_pin_priority ?? 9999,
          isAreaPinned: (r.restaurant_area_pins || []).length > 0 ? 1 : 0,
          areaMinPriority: pinPriorities.length > 0 ? Math.min(...pinPriorities) : null,
        }
      })
      /** ✅ SORT LOGIC */
      .sort((a: any, b: any) => {
        if (a.isHomePinned !== b.isHomePinned) return b.isHomePinned - a.isHomePinned // 1️⃣ Home pinned first
        if (a.homePriority !== b.homePriority) return a.homePriority - b.homePriority

        if (a.isAreaPinned !== b.isAreaPinned) return b.isAreaPinned - a.isAreaPinned // 2️⃣ Area pinned next
        const aMin = a.areaMinPriority ?? -Infinity
        const bMin = b.areaMinPriority ?? -Infinity
        if (aMin !== bMin) return aMin - bMin

        if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1 // 3️⃣ Normal fallback
        return a.id < b.id ? -1 : 1
      })
    const pageIds = sortedRows.slice(skip, skip + exportLimit).map((r: any) => r.id)

    const pageRows = await fetchByIds("restaurants", RESTAURANT_DOC_SELECT, pageIds)
    const pageRowById = new Map(pageRows.map((r: any) => [r.id, r]))
    const restaurants = pageIds
      .map((rid: string) => pageRowById.get(rid))
      .filter(Boolean)
      .map(mapRestaurantDoc)

    // Get restaurant IDs for this page
    const restaurantIds = restaurants.map(restaurant => restaurant._id)

    // Optimize: Combine both offer count queries into one aggregation with $facet
    const currentDate = new Date()
    const offerRows = await fetchByIds("offers", "restaurant_id, status", restaurantIds, {
      column: "restaurant_id",
      apply: (q) =>
        q
          .in("status", ["active", "pending"])
          .or(`expiry_date.gt.${currentDate.toISOString()},expiry_date.is.null`),
    })
    const activeCounts: Record<string, number> = {}
    const pendingCounts: Record<string, number> = {}
    for (const o of offerRows) {
      const bucket = o.status === "active" ? activeCounts : pendingCounts
      bucket[o.restaurant_id] = (bucket[o.restaurant_id] || 0) + 1
    }
    const offerCounts = [
      {
        active: Object.entries(activeCounts).map(([_id, count]) => ({ _id, count })),
        pending: Object.entries(pendingCounts).map(([_id, count]) => ({ _id, count })),
      },
    ]

    console.log('Offer Counts Result:', JSON.stringify(offerCounts, null, 2))

    // Create lookup maps from combined results
    const activeOffersMap = (offerCounts[0]?.active || []).reduce((map: Record<string, number>, item: any) => {
      map[item._id.toString()] = item.count
      return map
    }, {} as Record<string, number>)

    const pendingOffersMap = (offerCounts[0]?.pending || []).reduce((map: Record<string, number>, item: any) => {
      map[item._id.toString()] = item.count
      return map
    }, {} as Record<string, number>)

    // Optimize: Collect all unique IDs first
    const allCategoryIds = new Set<string>()
    const allUserIds = new Set<string>()
    const allAreaIds = new Set<string>()

    restaurants.forEach((restaurant) => {
      if (Array.isArray(restaurant.category)) {
        restaurant.category.forEach((catId: any) => allCategoryIds.add(catId.toString()))
      } else if (restaurant.category) {
        allCategoryIds.add((restaurant.category as any).toString())
      }

      // Collect user IDs from both userId and associatedId
      if (restaurant.userId) {
        allUserIds.add(restaurant.userId.toString())
      }
      if (restaurant.associatedId) {
        // associatedId is stored as string, so add it directly
        allUserIds.add(restaurant.associatedId.toString())
      }

      if (restaurant.area) {
        const areaIds = Array.isArray(restaurant.area) ? restaurant.area : [restaurant.area]
        areaIds.forEach((areaId: any) => {
          if (typeof areaId === 'string' || (areaId && areaId._id)) {
            allAreaIds.add((typeof areaId === 'string' ? areaId : areaId._id).toString())
          }
        })
      }
    })

    // Optimize: Batch fetch all data at once
    const [categoriesData, usersData, areasData, dynamicFilters] = await Promise.all([
      fetchByIds("categories", "id, name", Array.from(allCategoryIds)).then((rows) =>
        rows.map((c: any) => ({ _id: c.id, name: c.name }))
      ),
      fetchByIds("users", "id, first_name, last_name", Array.from(allUserIds)).then((rows) =>
        rows.map((u: any) => ({ _id: u.id, firstName: u.first_name, lastName: u.last_name }))
      ),
      fetchByIds("areas", "id, name", Array.from(allAreaIds)).then((rows) =>
        rows.map((a: any) => ({ _id: a.id, name: a.name }))
      ),
      getDynamicFilterOptions()
    ])

    // Create lookup maps for O(1) access
    const categoryMap = new Map(categoriesData.map((cat: any) => [cat._id.toString(), cat]))
    const userMap = new Map(usersData.map((user: any) => [user._id.toString(), user]))
    const areaMap = new Map(areasData.map((area: any) => [area._id.toString(), area]))

    // Format restaurants without additional DB calls
    const formattedRestaurants = restaurants.map((restaurant: any) => {
      const restaurantIdStr = restaurant._id.toString()

      // Get categories from map
      const categories: { id: any; name: string }[] = []
      if (Array.isArray(restaurant.category)) {
        const categoryList = restaurant.category.map((catId: any) => {
          const category = categoryMap.get(catId.toString())
          return {
            id: catId,
            name: category ? category.name : null
          }
        }).filter((cat: any) => cat.name !== null) as { id: any; name: string }[]
        categories.push(...categoryList)
      } else if (restaurant.category) {
        const category = categoryMap.get(restaurant.category.toString())
        if (category) {
          categories.push({
            id: restaurant.category,
            name: category.name
          })
        }
      }

      // Get owner from map - check userId first, then associatedId
      let ownerName = null
      if (restaurant.userId) {
        const user = userMap.get(restaurant.userId.toString())
        if (user) {
          ownerName = `${user.firstName} ${user.lastName}`
        }
      }
      // If no owner found via userId, check associatedId (stored as string)
      if (!ownerName && restaurant.associatedId) {
        const user = userMap.get(restaurant.associatedId.toString())
        if (user) {
          ownerName = `${user.firstName} ${user.lastName}`
        }
      }

      // Get areas from map
      let areas: { id: string, name: string }[] = []
      if (restaurant.area) {
        const areaIds = Array.isArray(restaurant.area) ? restaurant.area : [restaurant.area]

        areas = areaIds.map((areaId: any) => {
          if (typeof areaId === 'object' && areaId.name) {
            return {
              id: areaId._id.toString(),
              name: areaId.name
            }
          } else {
            const area = areaMap.get(areaId.toString())
            return area ? {
              id: area._id.toString(),
              name: area.name
            } : null
          }
        })
          .filter((area: { id: string, name: string } | null): area is { id: string, name: string } => area !== null)
          .filter((area: { id: string, name: string }, index: number, self: { id: string, name: string }[]) =>
            index === self.findIndex((t: { id: string, name: string }) => t.id === area.id)
          )
      }

      // Format areaPins with area name
      const formattedAreaPins =
        Array.isArray(restaurant.areaPins) && restaurant.areaPins.length > 0
          ? restaurant.areaPins
            .map((pin: any) => {
              const area = areaMap.get(pin.areaId?.toString())
              if (!area) return null

              return {
                areaId: area._id.toString(),
                areaName: area.name,
                isPinned: pin.isPinned,
                priority: pin.priority,
                pinnedAt: pin.areaPinnedAt,
              }
            })
            .filter(Boolean)
          : []

      return {
        _id: restaurant._id,
        name: restaurant.name,
        email: restaurant.email,
        phone: restaurant.phone,
        address: restaurant.address,
        city: restaurant.city,
        zipCode: restaurant.zipCode,
        areas: areas.length > 0 ? areas : null,
        website: restaurant.website,
        images: restaurant.images,
        description: restaurant.description,
        menuPdfUrls: restaurant.menuPdfUrls || [],
        addressLink: restaurant.addressLink,
        dineIn: restaurant.dineIn,
        dineOut: restaurant.dineOut,
        deliveryAvailable: restaurant.deliveryAvailable,
        status: restaurant.status,
        activeOffersCount: activeOffersMap[restaurantIdStr] || 0,
        pendingOffersCount: pendingOffersMap[restaurantIdStr] || 0,
        totalOffersCount:
          (activeOffersMap[restaurantIdStr] || 0) +
          (pendingOffersMap[restaurantIdStr] || 0),
        createdAt: restaurant.createdAt,
        updatedAt: restaurant.updatedAt,
        associatedId: restaurant.associatedId,
        category: categories,
        userId: restaurant.userId,
        ownerName,
        homePin: {
          isPinned: restaurant.homePin?.isPinned || false,
          priority: restaurant.homePin?.priority ?? null,
          pinnedAt: restaurant.homePin?.pinnedAt ?? null,
        },
        areaPins: formattedAreaPins,
      }
    })

    // Get global statistics
    const globalStats = await getGlobalRestaurantStats()

    return NextResponse.json({
      success: true,
      restaurants: formattedRestaurants,
      pagination: {
        total: totalRestaurants,
        page,
        limit,
        pages: totalPages
      },
      filters: dynamicFilters,
      stats: globalStats
    })
  } catch (error: unknown) {
    console.error("Error fetching restaurants:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch restaurants",
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}

// Helper function to get dynamic filter options
async function getDynamicFilterOptions() {
  // Optimize: Run all queries in parallel and use lean() for better performance
  const [areas, statuses, categories] = await Promise.all([
    fetchAllRows(() =>
      supabaseAdmin.from("areas").select("id, name").order("created_at", { ascending: true }).order("id", { ascending: true })
    ).then((rows) => rows.map((a: any) => ({ _id: a.id, name: a.name }))),
    fetchAllRows(() =>
      supabaseAdmin.from("restaurants").select("id, status").order("id", { ascending: true })
    ).then((rows) => Array.from(new Set(rows.map((r: any) => r.status))).sort() as string[]),
    fetchAllRows(() =>
      supabaseAdmin.from("categories").select("id, name").order("created_at", { ascending: true }).order("id", { ascending: true })
    ).then((rows) => rows.map((c: any) => ({ _id: c.id, name: c.name })))
  ])

  return {
    areas: areas.map(area => ({
      value: area.name,
      label: area.name
    })),
    statuses: statuses.filter(status => status != null).map(status => ({
      value: status,
      label: status.charAt(0).toUpperCase() + status.slice(1)
    })),
    categories: categories.map(cat => ({
      value: cat._id,
      label: cat.name
    }))
  }
}

// Helper function to get global restaurant statistics
async function getGlobalRestaurantStats() {
  // Optimize: Run all count queries in parallel instead of sequentially
  const [
    totalRestaurants,
    activeRestaurants,
    pendingRestaurants,
    rejectedRestaurants,
    totalOffers,
    activeOffers
  ] = await Promise.all([
    countOf(supabaseAdmin.from("restaurants").select("id", { count: "exact", head: true })),
    countOf(supabaseAdmin.from("restaurants").select("id", { count: "exact", head: true }).eq("status", "approved")),
    countOf(supabaseAdmin.from("restaurants").select("id", { count: "exact", head: true }).eq("status", "pending")),
    countOf(supabaseAdmin.from("restaurants").select("id", { count: "exact", head: true }).eq("status", "rejected")),
    countOf(supabaseAdmin.from("offers").select("id", { count: "exact", head: true })),
    countOf(supabaseAdmin.from("offers").select("id", { count: "exact", head: true }).eq("status", "active"))
  ])

  return {
    totalRestaurants,
    activeRestaurants,
    pendingRestaurants,
    rejectedRestaurants,
    totalOffers,
    activeOffers
  }
}