import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { tagId, offerId } = await req.json();

    if (!tagId || !offerId) {
      return NextResponse.json(
        { success: false, message: "tagId and offerId are required" },
        { status: 400 }
      );
    }

    // Verify tag exists
    const { data: tag, error: tagErr } = await supabaseAdmin
      .from("tags")
      .select("id, name")
      .eq("id", tagId)
      .maybeSingle();

    if (tagErr) throw new Error(tagErr.message);
    if (!tag) {
      return NextResponse.json(
        { success: false, message: "Tag not found" },
        { status: 404 }
      );
    }

    // Verify offer exists and is active
    const { data: offer, error: offerErr } = await supabaseAdmin
      .from("offers")
      .select("id, status")
      .eq("id", offerId)
      .maybeSingle();

    if (offerErr) throw new Error(offerErr.message);
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

    // Insert into offer_tags (avoid duplicate)
    const { error: insertErr } = await supabaseAdmin
      .from("offer_tags")
      .upsert(
        { offer_id: offerId, tag_id: tagId },
        { onConflict: "offer_id, tag_id", ignoreDuplicates: true }
      );

    if (insertErr) throw new Error(insertErr.message);

    return NextResponse.json({
      success: true,
      message: `Tag "${tag.name}" assigned to offer`,
    });
  } catch (err: any) {
    console.error("[POST /api/admin/new-tags/assign]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tagId, offerId } = await req.json();

    if (!tagId || !offerId) {
      return NextResponse.json(
        { success: false, message: "tagId and offerId are required" },
        { status: 400 }
      );
    }

    // Verify offer exists
    const { data: offer, error: offerErr } = await supabaseAdmin
      .from("offers")
      .select("id")
      .eq("id", offerId)
      .maybeSingle();

    if (offerErr) throw new Error(offerErr.message);
    if (!offer) {
      return NextResponse.json(
        { success: false, message: "Offer not found" },
        { status: 404 }
      );
    }

    const { error: delErr } = await supabaseAdmin
      .from("offer_tags")
      .delete()
      .eq("offer_id", offerId)
      .eq("tag_id", tagId);

    if (delErr) throw new Error(delErr.message);

    return NextResponse.json({
      success: true,
      message: "Tag removed from offer",
    });
  } catch (err: any) {
    console.error("[DELETE /api/admin/new-tags/assign]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}