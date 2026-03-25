// app/api/tags/route.ts

import { NextRequest, NextResponse } from "next/server";
import Tag from "@/models/Tag";               // ← you need to create this model
import Restaurant from "@/models/Restaurant";
import connectToDatabase from "@/lib/mongodb";
import { verifyAdminToken } from "@/lib/auth-admin";

interface TagInput {
  name: string;
  slug?: string;
  isActive?: boolean;
  restaurantIds?: string[];     // optional: assign restaurants during creation
}

// ───────────────────────────────────────────────
// GET    /api/tags     ← list / search / paginate
// ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const tags = await Tag.aggregate([
      {
        $sort: { name: 1 },
      },

      // STEP 1 — Find active offers that use this tag
      {
        $lookup: {
          from: "offers",
          let: { tagId: { $toString: "$_id" } },
          pipeline: [
            {
              $match: {
                status: "active",
                tags: { $exists: true, $type: "array" },
                $expr: {
                  $in: ["$$tagId", "$tags"],
                },
              },
            },
            {
              $project: {
                restaurantId: 1,
              },
            },
          ],
          as: "offers",
        },
      },

      // STEP 2 — Extract unique restaurantIds
      {
        $addFields: {
          restaurantIds: {
            $setUnion: [
              [],
              {
                $map: {
                  input: "$offers",
                  as: "o",
                  in: "$$o.restaurantId",
                },
              },
            ],
          },
        },
      },

      // STEP 3 — Lookup restaurants
      {
        $lookup: {
          from: "restaurants",
          let: { ids: "$restaurantIds" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$ids"] },
                hidden: false,   // ← important filter
              },
            },
          ],
          as: "restaurants",
        },
      },

      // STEP 4 — restaurant count
      {
        $addFields: {
          restaurantCount: { $size: "$restaurants" },
        },
      },

      // STEP 5 — remove temp fields (ONLY exclusion)
      {
        $project: {
          offers: 0,
          restaurantIds: 0,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      tags,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}

// ───────────────────────────────────────────────
// POST   /api/tags     ← create tag + optional restaurants
// ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      slug,
      isActive = true,
      restaurantIds = [],
      addRestaurants = [],
    } = body;

    const finalRestaurantIds = addRestaurants.length
      ? addRestaurants
      : restaurantIds;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "Name is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const baseSlug =
      slug?.trim() ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    let finalSlug = baseSlug || "tag";
    let suffix = 2;
    while (await Tag.findOne({ slug: finalSlug })) {
      finalSlug = `${baseSlug || "tag"}-${suffix}`;
      suffix += 1;
    }

    const tag = await Tag.create({
      name: name.trim(),
      slug: finalSlug,
      isActive,
    });

    let affectedRestaurants = 0;

    if (finalRestaurantIds.length > 0) {
      const validRestaurants = await Restaurant.find({
        _id: { $in: finalRestaurantIds },
        status: "approved",
      }).select("_id");

      if (validRestaurants.length > 0) {
        const validIds = validRestaurants.map((r) => r._id);

        // ✅ Restaurant → save tag id in searchTags
        await Restaurant.updateMany(
          { _id: { $in: validIds } },
          { $addToSet: { searchTags: tag._id } }
        );

        // ✅ Tag → save restaurant ids
        await Tag.findByIdAndUpdate(tag._id, {
          $addToSet: { restaurants: { $each: validIds } },
        });

        affectedRestaurants = validIds.length;
      }
    }

    return NextResponse.json(
      {
        success: true,
        tag: {
          _id: tag._id,
          name: tag.name,
          slug: tag.slug,
          isActive: tag.isActive,
          restaurantCount: affectedRestaurants,
          createdAt: tag.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}


// ───────────────────────────────────────────────
// PUT    /api/tags?id=xxx   ← update + add/remove restaurants
// ───────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("Tag ID is required");

    const body: {
      name?: string;
      slug?: string;
      isActive?: boolean;
      addRestaurants?: string[];
      removeRestaurants?: string[];
    } = await req.json();

    await connectToDatabase();

    const tag = await Tag.findById(id);
    if (!tag) return notFound("Tag not found");

    /* ───────── Basic field updates ───────── */

    const basicUpdate: any = {};

    if (body.name?.trim()) {
      basicUpdate.name = body.name.trim();
    }

    if (body.slug?.trim()) {
      const slugExists = await Tag.findOne({
        slug: body.slug.trim(),
        _id: { $ne: id },
      });
      if (slugExists) return conflict("Slug already taken");
      basicUpdate.slug = body.slug.trim();
    }

    if ("isActive" in body) {
      basicUpdate.isActive = !!body.isActive;
    }

    if (Object.keys(basicUpdate).length > 0) {
      await Tag.findByIdAndUpdate(id, basicUpdate, {
        runValidators: true,
      });
    }

    /* ───────── Add restaurants ───────── */

    if (body.addRestaurants?.length) {
      const toAdd = await Restaurant.find({
        _id: { $in: body.addRestaurants },
        status: "approved",
      }).distinct("_id");

      if (toAdd.length) {
        // ✅ Restaurant → add tag id
        await Restaurant.updateMany(
          { _id: { $in: toAdd } },
          { $addToSet: { searchTags: tag._id } }
        );

        // ✅ Tag → add restaurants
        await Tag.findByIdAndUpdate(
          id,
          { $addToSet: { restaurants: { $each: toAdd } } },
          { runValidators: true }
        );
      }
    }

    /* ───────── Remove restaurants ───────── */

    if (body.removeRestaurants?.length) {
      // ✅ Restaurant → remove tag id
      await Restaurant.updateMany(
        { _id: { $in: body.removeRestaurants } },
        { $pull: { searchTags: tag._id } }
      );

      // ✅ Tag → remove restaurants
      await Tag.findByIdAndUpdate(
        id,
        { $pull: { restaurants: { $in: body.removeRestaurants } } },
        { runValidators: true }
      );
    }

    /* ───────── Final response ───────── */

    const updated = await Tag.findById(id);

    const count = await Restaurant.countDocuments({
      searchTags: updated?._id,
    });

    return NextResponse.json({
      success: true,
      tag: {
        _id: updated?._id,
        name: updated?.name,
        slug: updated?.slug,
        isActive: updated?.isActive,
        restaurantCount: count,
      },
      message: "Tag updated successfully",
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// ───────────────────────────────────────────────
// DELETE /api/tags?id=xxx
// ───────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) return unauthorized();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("Tag ID required");

    await connectToDatabase();

    const tag = await Tag.findById(id);
    if (!tag) return notFound("Tag not found");

    const linkedRestaurants = await Restaurant.countDocuments({
      searchTags: tag._id,
    });

    if (linkedRestaurants > 0) {
      return conflict("Tag is linked to restaurants and cannot be deleted");
    }

    // ✅ 1. REMOVE TAG FROM ALL RESTAURANTS
    await Restaurant.updateMany(
      { searchTags: tag._id },
      { $pull: { searchTags: tag._id } }
    );

    // ✅ 2. DELETE TAG ITSELF
    await Tag.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Tag deleted and removed from all restaurants",
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}


// Helpers
function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
}
function badRequest(msg: string) {
  return NextResponse.json({ success: false, message: msg }, { status: 400 });
}
function notFound(msg: string) {
  return NextResponse.json({ success: false, message: msg }, { status: 404 });
}
function conflict(msg: string) {
  return NextResponse.json({ success: false, message: msg }, { status: 409 });
}