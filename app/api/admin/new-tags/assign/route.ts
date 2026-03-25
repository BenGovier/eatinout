// app/api/new-tags/assign/route.ts

import { type NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Offer from "@/models/Offer";
import Tag from "@/models/Tag";

// ─────────────────────────────────────────────────────────────────
// POST /api/new-tags/assign
// Body: { tagId: string, offerId: string }
// Adds tagId into Offer.tags[]
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const { tagId, offerId } = await req.json();

    if (!tagId || !offerId) {
      return NextResponse.json(
        { success: false, message: "tagId and offerId are required" },
        { status: 400 }
      );
    }

    // Verify tag exists
    const tag = await Tag.findById(tagId);
    if (!tag) {
      return NextResponse.json(
        { success: false, message: "Tag not found" },
        { status: 404 }
      );
    }

    // Verify offer exists and is active
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return NextResponse.json(
        { success: false, message: "Offer not found" },
        { status: 404 }
      );
    }
    if (offer.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Can only assign tags to active offers" },
        { status: 400 }
      );
    }

    // $addToSet prevents duplicates
    await Offer.findByIdAndUpdate(offerId, {
      $addToSet: { tags: tagId },
    });

    return NextResponse.json({
      success: true,
      message: `Tag "${tag.name}" assigned to offer`,
    });
  } catch (err: any) {
    console.error("[POST /api/new-tags/assign]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE /api/new-tags/assign
// Body: { tagId: string, offerId: string }
// Removes tagId from Offer.tags[]
// ─────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();

    const { tagId, offerId } = await req.json();

    if (!tagId || !offerId) {
      return NextResponse.json(
        { success: false, message: "tagId and offerId are required" },
        { status: 400 }
      );
    }

    const offer = await Offer.findByIdAndUpdate(
      offerId,
      { $pull: { tags: tagId } },
      { new: true }
    );

    if (!offer) {
      return NextResponse.json(
        { success: false, message: "Offer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tag removed from offer",
    });
  } catch (err: any) {
    console.error("[DELETE /api/new-tags/assign]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}