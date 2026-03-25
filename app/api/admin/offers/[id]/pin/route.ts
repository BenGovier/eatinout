import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Offer from "@/models/Offer";
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

    await connectToDatabase();

    // 2️⃣ Find offer
    const offer = await Offer.findById(id);
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
      const unpinnedCount = await Offer.updateMany(
        {
          restaurantId: offer.restaurantId, // 🔥 key change
          isPinned: true,
          _id: { $ne: id },
        },
        { $set: { isPinned: false, pinnedAt: null } }
      );

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
    await offer.save();

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