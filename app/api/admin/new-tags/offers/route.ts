// app/api/new-tags/offers/route.ts
// GET /api/new-tags/offers?restaurantId=xxx
// Returns all offers for a restaurant with their current tags

import { type NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Offer from "@/models/Offer";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    const query: any = {};
    if (restaurantId) {
      query.restaurantId = restaurantId;
    }

    const offers = await Offer.find(query)
      .select("_id title status restaurantId tags deactivated")
      .sort({ status: 1, title: 1 })
      .lean();

    const mapped = offers.map((o: any) => ({
      _id: o._id,
      title: o.title,
      restaurantId: o.restaurantId,
      // Treat as expired if status is not active or deactivated
      status: (() => {
        if (o.status === "inactive") return "inactive"

        if (o.status === "active" && o.deactivated) return "inactive"

        if (o.status === "active") {
          const now = new Date()
          const end = new Date(o.validTill) // adjust field name

          if (now > end) return "expired"
          return "active"
        }

        return "expired"
      })(),
      tags: o.tags || [],
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (err: any) {
    console.error("[GET /api/new-tags/offers]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}