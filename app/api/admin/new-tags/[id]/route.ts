// app/api/new-tags/[id]/route.ts

import { type NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Tag from "@/models/Tag";
import Offer from "@/models/Offer";

// ─────────────────────────────────────────────────────────────────
// PUT /api/new-tags/[id]
// Body: { name?: string, isActive?: boolean }
// ─────────────────────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const { id } = params;
    const body = await req.json();
    const { name, isActive } = body;

    const tag = await Tag.findById(id);
    if (!tag) {
      return NextResponse.json(
        { success: false, message: "Tag not found" },
        { status: 404 }
      );
    }

    const update: any = {};

    if (name?.trim()) {
      // Check duplicate name (excluding self)
      const duplicate = await Tag.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        _id: { $ne: id },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: "Tag name already exists" },
          { status: 409 }
        );
      }
      update.name = name.trim();

      // Regenerate slug
      const baseSlug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "tag";

      let finalSlug = baseSlug;
      let suffix = 2;
      while (await Tag.findOne({ slug: finalSlug, _id: { $ne: id } })) {
        finalSlug = `${baseSlug}-${suffix}`;
        suffix++;
      }
      update.slug = finalSlug;
    }

    if (typeof isActive === "boolean") {
      update.isActive = isActive;
    }

    const updated = await Tag.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[PUT /api/new-tags/[id]]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE /api/new-tags/[id]
// Removes tag from all offers' tags[] array, then deletes the tag
// ─────────────────────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const { id } = params;

    const tag = await Tag.findById(id);
    if (!tag) {
      return NextResponse.json(
        { success: false, message: "Tag not found" },
        { status: 404 }
      );
    }

    // Remove this tag's id string from all offers
    await Offer.updateMany(
      { tags: id },
      { $pull: { tags: id } }
    );

    await Tag.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Tag deleted and removed from all offers",
    });
  } catch (err: any) {
    console.error("[DELETE /api/new-tags/[id]]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}