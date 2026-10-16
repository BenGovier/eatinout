import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: offer, error } = await supabaseAdmin
      .from("offers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Supabase error fetching offer:", error);
      return new NextResponse("Internal error", { status: 500 });
    }

    if (!offer) {
      return new NextResponse("Offer not found", { status: 404 });
    }

    // Format offer object to match frontend camelCase expectations
    const formattedOffer = {
      ...offer,
      _id: offer.id,
      restaurantId: offer.restaurant_id,
      offerType: offer.offer_type,
      discountPercentage: offer.discount_percentage,
      freeItemName: offer.free_item_name,
      otherOfferDescription: offer.other_offer_description,
      validDays: offer.valid_days,
      validHours: offer.valid_hours,
      startDate: offer.start_date,
      expiryDate: offer.expiry_date,
      dineIn: offer.dine_in,
      dineOut: offer.dine_out,
      runUntilFurther: offer.run_until_further,
      maxRedemptionLimit: offer.max_redemption_limit,
      isUnlimited: offer.is_unlimited,
      redeemCount: offer.redeem_count,
      bookingRequirement: offer.booking_requirement,
      recurringType: offer.recurring_type,
      recurringStartDate: offer.recurring_start_date,
      currentPeriodCount: offer.current_period_count,
      lastResetDate: offer.last_reset_date,
      deactivated: offer.is_deactivated,
      isPinned: offer.is_pinned,
      pinnedAt: offer.pinned_at,
      createdAt: offer.created_at,
      updatedAt: offer.updated_at,
    };

    return NextResponse.json(formattedOffer);
  } catch (error) {
    console.error("Error getting offer:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
