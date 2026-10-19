// app/api/admin/offers/[id]/pin/route.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/auth-admin";

// PUT endpoint to pin / unpin an offer (restaurant-wise)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1️⃣ Verify admin authentication
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: 401 }
      );
    }

    const { id } = params;
    const { isPinned } = await req.json();

    // 2️⃣ Find offer
    const { data: offerRow, error: offerError } = await supabaseAdmin
      .from("offers")
      .select("id, restaurant_id, is_pinned, pinned_at")
      .eq("id", id)
      .maybeSingle();
    if (offerError) throw new Error(offerError.message);
    // same field names the rest of this route already uses
    const offer = offerRow && {
      _id: offerRow.id,
      restaurantId: offerRow.restaurant_id,
      isPinned: offerRow.is_pinned,
      pinnedAt: offerRow.pinned_at ? new Date(offerRow.pinned_at) : null,
    };
    if (!offer) {
      return NextResponse.json(
        { success: false, message: "Offer not found" },
        { status: 404 }
      );
    }

    let message = "";

    // 3️⃣ Unpin logic
    if (isPinned === false) {
      offer.isPinned = false;
      offer.pinnedAt = null;
      message = "Offer unpinned successfully";
    }

    // 4️⃣ Pin logic (RESTAURANT-WISE)
    if (isPinned === true) {
      // Unpin other offers of SAME restaurant
      const { data: unpinnedRows, error: unpinError } = await supabaseAdmin
        .from("offers")
        .update({ is_pinned: false, pinned_at: null })
        .eq("restaurant_id", offer.restaurantId) // 🔥 key change
        .eq("is_pinned", true)
        .neq("id", id)
        .select("id");
      if (unpinError) throw new Error(unpinError.message);
      const unpinnedCount = { modifiedCount: unpinnedRows?.length || 0 };

      // Pin current offer
      offer.isPinned = true;
      offer.pinnedAt = new Date();

      if (unpinnedCount.modifiedCount > 0) {
        message = `Offer pinned successfully for this restaurant. ${unpinnedCount.modifiedCount} previous pinned offer unpinned.`;
      } else {
        message = "Offer pinned successfully for this restaurant";
      }
    }

    // 5️⃣ Save offer
    const { error: saveError } = await supabaseAdmin
      .from("offers")
      .update({ is_pinned: offer.isPinned, pinned_at: offer.pinnedAt })
      .eq("id", id);
    if (saveError) throw new Error(saveError.message);

    // 6️⃣ Response
    return NextResponse.json({
      success: true,
      message,
      offer: {
        _id: offer._id,
        restaurantId: offer.restaurantId,
        isPinned: offer.isPinned,
        pinnedAt: offer.pinnedAt,
      },
    });
  } catch (error: any) {
    console.error("Error pinning offer:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to pin/unpin offer",
        error: error.message,
      },
      { status: 500 }
    );
  }
}