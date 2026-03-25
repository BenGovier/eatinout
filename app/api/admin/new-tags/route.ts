import { type NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Tag from "@/models/Tag";
import Offer from "@/models/Offer";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const sort = searchParams.get("sort") || "name-asc";
    const skip = (page - 1) * limit;

    const matchStage: any = {};
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      matchStage.name = { $regex: escapedSearch, $options: "i" };
    }

    // ── 1. Stats — single $facet call instead of 3 separate DB round-trips ─
    const [totalTagsCount, statsFacet] = await Promise.all([
      Tag.countDocuments({}),

      Offer.aggregate([
        { $match: { tags: { $exists: true, $not: { $size: 0 } } } },
        {
          $facet: {
            totalAssoc: [
              { $project: { tagCount: { $size: { $ifNull: ["$tags", []] } } } },
              { $group: { _id: null, total: { $sum: "$tagCount" } } },
            ],
            tagsWithRest: [
              {
                $lookup: {
                  from: "restaurants",
                  localField: "restaurantId",
                  foreignField: "_id",
                  pipeline: [{ $project: { _id: 1, hidden: 1 } }],
                  as: "_rest",
                },
              },
              { $match: { "_rest.0": { $exists: true }, "_rest.hidden": { $ne: true } } },
              { $unwind: "$tags" },
              { $group: { _id: "$tags", restaurants: { $addToSet: "$restaurantId" } } },
              { $match: { "restaurants.0": { $exists: true } } },
              { $count: "count" },
            ],
          },
        },
      ]),
    ]);

    const totalAssocCount = statsFacet[0]?.totalAssoc[0]?.total ?? 0;
    const tagsWithRestCount = statsFacet[0]?.tagsWithRest[0]?.count ?? 0;

    const globalStats = {
      totalTags: totalTagsCount,
      tagsWithRestaurants: tagsWithRestCount,
      totalAssociations: totalAssocCount,
      avgPerTag: totalTagsCount > 0
        ? (totalAssocCount / totalTagsCount).toFixed(1)
        : "0",
    };

    // ── 2. Filtered total count for pagination ─────────────────────────────
    const total = search ? await Tag.countDocuments(matchStage) : totalTagsCount;

    // ── 3. Sort Configuration ──────────────────────────────────────────────
    const sortStage: any = {};
    if (sort === "name-desc") {
      sortStage._nameLower = -1;
    } else if (sort === "name-asc") {
      sortStage._nameLower = 1;
    } else if (sort === "newest") {
      sortStage.createdAt = -1;
      sortStage._nameLower = 1;
    } else if (sort === "oldest") {
      sortStage.createdAt = 1;
      sortStage._nameLower = 1;
    } else if (sort === "offers-desc") {
      sortStage.totalOfferCount = -1;
      sortStage._nameLower = 1;
    } else if (sort === "offers-asc") {
      sortStage.totalOfferCount = 1;
      sortStage._nameLower = 1;
    } else {
      sortStage._nameLower = 1; // default
    }

    const isOfferSort = sort === "offers-desc" || sort === "offers-asc";

    // ── 4. Main Lookup Stages ──────────────────────────────────────────────
    const lookupStages: any[] = [
      { $project: { _id: 1, name: 1, createdAt: 1, _nameLower: 1 } },

      // Offers lookup
      {
        $lookup: {
          from: "offers",
          let: { tagId: { $toString: "$_id" } },
          pipeline: [
            { $match: { $expr: { $in: ["$$tagId", { $ifNull: ["$tags", []] }] } } },
            { $project: { _id: 1, title: 1, status: 1, restaurantId: 1, startDate: 1, expiryDate: 1 } },
          ],
          as: "offers",
        },
      },

      // Restaurants lookup — hidden: true restaurants are excluded here
      {
        $lookup: {
          from: "restaurants",
          localField: "offers.restaurantId",
          foreignField: "_id",
          pipeline: [
            { $match: { hidden: { $ne: true } } },  // ← hidden restaurants filtered out
            { $project: { _id: 1, name: 1, city: 1, status: 1 } },
          ],
          as: "restaurants",
        },
      },

      // FIX: remove offers whose restaurant is hidden (not in restaurants array)
      {
        $addFields: {
          offers: {
            $filter: {
              input: "$offers",
              as: "offer",
              cond: {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: "$restaurants",
                        as: "r",
                        cond: { $eq: ["$$r._id", "$$offer.restaurantId"] },
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
      },

      // Enrich remaining offers with status + restaurant name
      {
        $addFields: {
          offers: {
            $map: {
              input: "$offers",
              as: "offer",
              in: {
                offerId: { $toString: "$$offer._id" },
                offerTitle: "$$offer.title",
                offerStatus: {
                  $cond: {
                    if: {
                      $eq: ["$$offer.status", "active"]
                    },
                    then: {
                      $cond: {
                        if: {
                          $and: [
                            { $lte: ["$$offer.startDate", "$$NOW"] },
                            {
                              $or: [
                                { $gt: ["$$offer.expiryDate", "$$NOW"] },
                                { $eq: ["$$offer.expiryDate", null] },
                                { $not: ["$$offer.expiryDate"] }
                              ]
                            }
                          ]
                        },
                        then: "active",
                        else: "expired"
                      }
                    },
                    else: "$$offer.status" // ✅ keep original status
                  }
                },
                restaurantId: { $toString: "$$offer.restaurantId" },
                restaurantName: {
                  $let: {
                    vars: {
                      restaurant: {
                        $arrayElemAt: [
                          { $filter: { input: "$restaurants", as: "r", cond: { $eq: ["$$r._id", "$$offer.restaurantId"] } } },
                          0,
                        ],
                      },
                    },
                    in: "$$restaurant.name",
                  },
                },
              },
            },
          },
        },
      },

      // Offer counts — now based on filtered offers only
      {
        $addFields: {
          activeOfferCount: { $size: { $filter: { input: "$offers", as: "o", cond: { $eq: ["$$o.offerStatus", "active"] } } } },
          expiredOfferCount: { $size: { $filter: { input: "$offers", as: "o", cond: { $eq: ["$$o.offerStatus", "expired"] } } } },
          totalOfferCount: { $size: "$offers" },
        },
      },
    ];

    // ── 5. Main Pipeline ───────────────────────────────────────────────────
    const pipeline: any[] = [
      ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
      { $addFields: { _nameLower: { $toLower: "$name" } } },
    ];

    if (isOfferSort) {
      // Must do lookups first to calculate totalOfferCount, then sort/skip/limit
      pipeline.push(...lookupStages);
      pipeline.push({ $sort: sortStage });
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });
    } else {
      // Sort, skip, limit first for better performance, then lookups
      pipeline.push({ $sort: sortStage });
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });
      pipeline.push(...lookupStages);
    }

    pipeline.push({ $project: { _nameLower: 0, restaurants: 0 } });

    const tags = await Tag.aggregate(pipeline);

    return NextResponse.json({
      success: true,
      data: tags,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      stats: globalStats,
    });

  } catch (err: any) {
    console.error("[GET /api/admin/new-tags]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// POST /api/new-tags
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "Tag name is required" },
        { status: 400 }
      );
    }

    const baseSlug =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "tag";

    let finalSlug = baseSlug;
    let suffix = 2;

    while (await Tag.findOne({ slug: finalSlug })) {
      finalSlug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    const existing = await Tag.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Tag with this name already exists" },
        { status: 409 }
      );
    }

    const tag = await Tag.create({
      name: name.trim(),
      slug: finalSlug,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: tag._id,
          name: tag.name,
          slug: tag.slug,
          isActive: tag.isActive,
          offers: [],
          activeOfferCount: 0,
          expiredOfferCount: 0,
          totalOfferCount: 0,
          restaurantCount: 0,
          createdAt: tag.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/new-tags]", err);

    return NextResponse.json(
      {
        success: false,
        message: err.message || "Server error",
      },
      { status: 500 }
    );
  }
}