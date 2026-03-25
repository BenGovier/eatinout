// app/api/new-tags/bulk-delete/route.ts

import { type NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Tag from "@/models/Tag";
import Offer from "@/models/Offer";

// ─────────────────────────────────────────────────────────────────
// POST /api/new-tags/bulk-delete
// Body: { ids: string[] }
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tag IDs array is required" },
        { status: 400 }
      );
    }

    // Remove all these tag ids from all offers
    await Offer.updateMany(
      { tags: { $in: ids } },
      { $pull: { tags: { $in: ids } } }
    );

    // Delete all tags
    const result = await Tag.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({
      success: true,
      deleted: result.deletedCount,
      message: `${result.deletedCount} tags deleted and removed from all offers`,
    });
  } catch (err: any) {
    console.error("[POST /api/new-tags/bulk-delete]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}