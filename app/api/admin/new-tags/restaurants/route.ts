import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import Restaurant from "@/models/Restaurant"
import Offer from "@/models/Offer"
import Tag from "@/models/Tag"
import { verifyAdminToken } from "@/lib/auth-admin"
import { Category } from "@/models/Categories"
import Area from "@/models/Area"

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    await connectToDatabase()

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const isExport = searchParams.get('export') === 'true'
    const skip = isExport ? 0 : (page - 1) * limit
    const exportLimit = isExport ? 10000 : limit
    const rawSearch = searchParams.get('search') || ''
    const searchTerm = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const statusFilter = searchParams.get('status') || ''
    const areaFilter = searchParams.get('area') || ''
    const sortParam = searchParams.get('sort') || 'name-asc'

    const isOffersSort = sortParam === 'offers-asc' || sortParam === 'offers-desc'
    const isTagsSort = sortParam === 'tags-asc' || sortParam === 'tags-desc'
    const isNameSort = sortParam === 'name-asc' || sortParam === 'name-desc'

    // ── Base query — sirf approved restaurants ────────────────────────────────
    const query: any = {
      hidden: { $ne: true },
      status: "approved",
    }

    const [categoryIds, areaDoc] = await Promise.all([
      searchTerm
        ? Category.find({ name: { $regex: searchTerm, $options: 'i' } }).distinct('_id').lean()
        : Promise.resolve(null),
      areaFilter && areaFilter !== 'all'
        ? Area.findOne({ name: areaFilter }).select('_id').lean()
        : Promise.resolve(null),
    ])

    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        ...(categoryIds?.length ? [{ category: { $in: categoryIds } }] : []),
      ]
    }
    if (areaDoc) query.area = { $in: [(areaDoc as any)._id.toString()] }

    // ── Valid tag IDs as strings (Offer.tags = [String]) ──────────────────────
    const validTagDocs = await Tag.find({}, { _id: 1 }).lean()
    const validTagIdStrings = validTagDocs.map((t: any) => t._id.toString())

    let restaurants: any[]
    let totalRestaurants: number

    if (isNameSort) {
      const [aggregateResult] = await Restaurant.aggregate([
        { $match: query },
        {
          $addFields: {
            cleanName: { $trim: { input: "$name" } },

            sortPriority: {
              $switch: {
                branches: [
                  {
                    case: {
                      $regexMatch: {
                        input: { $trim: { input: "$name" } },
                        regex: /^[a-zA-Z]/
                      }
                    },
                    then: 0
                  },
                  {
                    case: {
                      $regexMatch: {
                        input: { $trim: { input: "$name" } },
                        regex: /^[0-9]/
                      }
                    },
                    then: 1
                  }
                ],
                default: 2
              }
            },

            sortName: {
              $toLower: {
                $trim: { input: "$name" }
              }
            }
          }
        },
        {
          $sort: {
            sortPriority: 1,
            sortName: sortParam === 'name-asc' ? 1 : -1
          }
        },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              { $skip: skip },
              { $limit: exportLimit },
              { $project: { _id: 1, name: 1, status: 1 } },
            ],
          },
        },
      ])
      totalRestaurants = aggregateResult?.metadata?.[0]?.total ?? 0
      restaurants = aggregateResult?.data ?? []

    } else if (isOffersSort || isTagsSort) {
      const allRestaurantIds: any[] = await Restaurant.find(query, { _id: 1 }).lean()
      totalRestaurants = allRestaurantIds.length
      const allIds = allRestaurantIds.map((r: any) => r._id)

      const scoreMap = new Map<string, number>()

      if (isOffersSort) {
        const offerGroups = await Offer.aggregate([
          { $match: { restaurantId: { $in: allIds }, status: 'active' } },
          { $group: { _id: '$restaurantId', count: { $sum: 1 } } },
        ])
        for (const g of offerGroups) scoreMap.set(g._id.toString(), g.count)

      } else {
        const tagGroups = await Offer.aggregate([
          {
            $match: {
              restaurantId: { $in: allIds },
              tags: { $exists: true, $not: { $size: 0 } },
            },
          },
          { $project: { restaurantId: 1, tags: 1 } },
          { $unwind: '$tags' },
          { $match: { tags: { $in: validTagIdStrings } } },
          { $group: { _id: { restaurantId: '$restaurantId', tag: '$tags' } } },
          { $group: { _id: '$_id.restaurantId', count: { $sum: 1 } } },
        ])
        for (const g of tagGroups) scoreMap.set(g._id.toString(), g.count)
      }

      const asc = sortParam.endsWith('-asc')
      const sortedIds = allIds.sort((a: any, b: any) => {
        const sa = scoreMap.get(a.toString()) ?? 0
        const sb = scoreMap.get(b.toString()) ?? 0
        return asc ? sa - sb : sb - sa
      })
      const pageIds = sortedIds.slice(skip, skip + exportLimit)

      if (pageIds.length === 0) {
        restaurants = []
      } else {
        const rawDocs: any[] = await Restaurant.find(
          { _id: { $in: pageIds } },
          { _id: 1, name: 1, status: 1 }
        ).lean()
        const docMap = new Map(rawDocs.map((d: any) => [d._id.toString(), d]))
        restaurants = pageIds.map((id: any) => docMap.get(id.toString())).filter(Boolean)
      }

    } else {
      const [aggregateResult] = await Restaurant.aggregate([
        { $match: query },
        {
          $addFields: {
            cleanName: { $trim: { input: "$name" } },

            sortPriority: {
              $switch: {
                branches: [
                  {
                    case: {
                      $regexMatch: {
                        input: { $trim: { input: "$name" } },
                        regex: /^[a-zA-Z]/
                      }
                    },
                    then: 0
                  },
                  {
                    case: {
                      $regexMatch: {
                        input: { $trim: { input: "$name" } },
                        regex: /^[0-9]/
                      }
                    },
                    then: 1
                  }
                ],
                default: 2
              }
            },

            sortName: {
              $toLower: {
                $trim: { input: "$name" }
              }
            }
          }
        },
        {
          $sort: {
            sortPriority: 1,
            sortName: 1
          }
        },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              { $skip: skip },
              { $limit: exportLimit },
              { $project: { _id: 1, name: 1, status: 1 } },
            ],
          },
        },
      ])
      totalRestaurants = aggregateResult?.metadata?.[0]?.total ?? 0
      restaurants = aggregateResult?.data ?? []
    }

    const totalPages = Math.ceil(totalRestaurants / limit)
    const restaurantIds = restaurants.map((r: any) => r._id)
    const currentDate = new Date()

    // ── Parallel: offer counts + tag counts + global stats ────────────────────
    const [offerCounts, tagCounts, globalStats] = await Promise.all([

      // 1. Per-restaurant offer counts grouped by status
      //    active  → activeOffersCount
      //    active + inactive + expired → totalOffersCount
      restaurantIds.length > 0
        ? Offer.aggregate([
          {
            $match: {
              restaurantId: { $in: restaurantIds },
              // Offer valid statuses: active, inactive, expired
              status: { $in: ['active', 'inactive', 'expired'] },
            },
          },
          {
            $group: {
              _id: { restaurantId: '$restaurantId', status: '$status' },
              count: { $sum: 1 },
            },
          },
        ])
        : Promise.resolve([]),

      // 2. Unique valid tag count per restaurant
      //    - Deleted tags filtered via $in validTagIdStrings
      //    - Same tag on multiple offers = counted once
      restaurantIds.length > 0
        ? Offer.aggregate([
          {
            $match: {
              restaurantId: { $in: restaurantIds },
              tags: { $exists: true, $not: { $size: 0 } },
            },
          },
          { $project: { restaurantId: 1, tags: 1 } },
          { $unwind: '$tags' },
          { $match: { tags: { $in: validTagIdStrings } } },
          { $group: { _id: { restaurantId: '$restaurantId', tagId: '$tags' } } },
          { $group: { _id: '$_id.restaurantId', tagCount: { $sum: 1 } } },
        ])
        : Promise.resolve([]),

      // 3. Global stats (unchanged)
      getGlobalRestaurantStats(),
    ])

    // ── Build lookup maps ─────────────────────────────────────────────────────
    // offerCounts grouped by { restaurantId, status } — teen status ke alag counts
    const activeOffersMap: Record<string, number> = {}
    const inactiveOffersMap: Record<string, number> = {}
    const expiredOffersMap: Record<string, number> = {}

    for (const item of offerCounts) {
      const rid = item._id.restaurantId.toString()
      if (item._id.status === 'active') activeOffersMap[rid] = item.count
      if (item._id.status === 'inactive') inactiveOffersMap[rid] = item.count
      if (item._id.status === 'expired') expiredOffersMap[rid] = item.count
    }

    const tagCountMap: Record<string, number> = {}
    for (const item of tagCounts as any[]) {
      tagCountMap[item._id.toString()] = item.tagCount
    }

    // ── Format response ───────────────────────────────────────────────────────
    const formattedRestaurants = restaurants.map((r: any) => {
      const rid = r._id.toString()
      const active = activeOffersMap[rid] || 0
      const inactive = inactiveOffersMap[rid] || 0
      const expired = expiredOffersMap[rid] || 0
      return {
        _id: r._id,
        name: r.name,
        status: r.status,
        activeOffersCount: active,
        totalOffersCount: active + inactive + expired, // ← all 3 statuses
        tagCount: tagCountMap[rid] || 0,
      }
    })

    return NextResponse.json({
      success: true,
      restaurants: formattedRestaurants,
      pagination: {
        total: totalRestaurants,
        page,
        limit,
        pages: totalPages,
        hasMore: page * limit < totalRestaurants,
      },
      stats: globalStats,
    })

  } catch (error: unknown) {
    console.error("Error fetching restaurants:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json(
      { success: false, message: "Failed to fetch restaurants", error: errorMessage },
      { status: 500 }
    )
  }
}

// Unchanged
async function getGlobalRestaurantStats() {
  const [restaurantStats, offerStats] = await Promise.all([
    Restaurant.aggregate([
      {
        $facet: {
          total: [{ $count: 'n' }],
          approved: [{ $match: { status: 'approved' } }, { $count: 'n' }],
          pending: [{ $match: { status: 'pending' } }, { $count: 'n' }],
          rejected: [{ $match: { status: 'rejected' } }, { $count: 'n' }],
        },
      },
    ]),
    Offer.aggregate([
      {
        $facet: {
          total: [{ $count: 'n' }],
          active: [{ $match: { status: 'active' } }, { $count: 'n' }],
        },
      },
    ]),
  ])

  const rs = restaurantStats[0]
  const os = offerStats[0]

  return {
    totalRestaurants: rs.total?.[0]?.n ?? 0,
    activeRestaurants: rs.approved?.[0]?.n ?? 0,
    pendingRestaurants: rs.pending?.[0]?.n ?? 0,
    rejectedRestaurants: rs.rejected?.[0]?.n ?? 0,
    totalOffers: os.total?.[0]?.n ?? 0,
    activeOffers: os.active?.[0]?.n ?? 0,
  }
}