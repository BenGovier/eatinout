import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { render } from "@react-email/render";
import NewOfferSubmissionEmail from "@/utils/email-templates/NewOfferSubmissionEmail";
import sendEmail from "@/lib/sendEmail";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

/**
 * Calculate offer status based on dates and manual deactivation
 * Rules:
 * - Active: Start Date is in the past AND (End Date is in the future OR NULL)
 * - Inactive: Start Date is in the future OR offer is manually deactivated
 * - Expired: End Date is in the past (and not NULL and not runUntilFurther)
 * Note: No pending status - all offers use date-based logic
 */
function calculateOfferStatus(
  startDate: Date | string | null | undefined,
  expiryDate: Date | string | null | undefined,
  runUntilFurther: boolean,
  deactivated: boolean,
  currentStatus?: string
): "active" | "inactive" | "expired" | "pending" | "rejected" {
  // Preserve rejected status only (no pending)
  if (currentStatus === "rejected") {
    return currentStatus;
  }

  // Map pending to inactive (for existing offers that might have pending status)
  if (currentStatus === "pending") {
    // Recalculate based on dates instead of keeping pending
  }

  // If manually deactivated, return inactive
  if (deactivated) {
    return "inactive";
  }

  const now = new Date(); // Keep full date/time for accurate comparison

  // Handle start date
  if (!startDate) {
    return "inactive";
  }
  const start = new Date(startDate); // Keep full date/time including hours/minutes

  // If start date/time is in the future, offer is inactive
  if (start > now) {
    return "inactive";
  }

  // Handle expiry date
  // If runUntilFurther is true, expiryDate should be treated as null
  if (runUntilFurther || !expiryDate) {
    // No expiry date - keep active until manually deactivated
    return "active";
  }

  const expiry = new Date(expiryDate); // Keep full date/time including hours/minutes

  // If expiry date/time is in the past, offer is expired
  if (expiry < now) {
    return "expired";
  }

  // Start date/time is in the past and expiry date/time is in the future (or null)
  return "active";
}

// GET endpoint to fetch restaurant offers

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    let restaurantId: string;
    let userId: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { restaurantId: string; role: string; userId: string };
      if (decoded.role !== "restaurant")
        return NextResponse.json({ message: "Unauthorized - Not a restaurant" }, { status: 403 });

      restaurantId = decoded.restaurantId;
      userId = decoded.userId;

      if (!restaurantId)
        return NextResponse.json({ message: "Restaurant ID not found in token" }, { status: 400 });
    } catch {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    // 1. Resolve restaurant IDs owned by this user
    let targetRestaurantIds: string[] = [];
    if (restaurantId) targetRestaurantIds.push(restaurantId);

    if (userId) {
      const { data: userRest } = await supabaseAdmin
        .from("restaurants")
        .select("id, subscription_status")
        .eq("user_id", userId);

      (userRest || []).forEach((r: any) => {
        if (!targetRestaurantIds.includes(r.id)) targetRestaurantIds.push(r.id);
      });
    }

    // Pagination
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    if (targetRestaurantIds.length === 0) {
      return NextResponse.json({
        success: true,
        offers: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
        subscription: { status: "inactive", hasActiveSubscription: false },
      });
    }

    // Count total offers
    const { count: totalOffersCount } = await supabaseAdmin
      .from("offers")
      .select("id", { count: "exact", head: true })
      .in("restaurant_id", targetRestaurantIds);

    const total = totalOffersCount || 0;

    // Fetch offers
    const { data: offersData, error: offersErr } = await supabaseAdmin
      .from("offers")
      .select("*")
      .in("restaurant_id", targetRestaurantIds)
      .order("created_at", { ascending: false });

    if (offersErr) {
      console.error("Supabase fetch offers error:", offersErr);
      return NextResponse.json({ message: "Failed to fetch offers", error: offersErr.message }, { status: 500 });
    }

    const allOffers = offersData || [];

    // Sort: Pinned first, then creation date desc
    const sortedOffers = allOffers.sort((a: any, b: any) => {
      if (a.is_pinned && b.is_pinned) {
        const aTime = a.pinned_at ? new Date(a.pinned_at).getTime() : 0;
        const bTime = b.pinned_at ? new Date(b.pinned_at).getTime() : 0;
        return bTime - aTime;
      }
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const aCreated = new Date(a.created_at).getTime();
      const bCreated = new Date(b.created_at).getTime();
      return bCreated - aCreated;
    });

    const paginatedOffers = sortedOffers.slice(skip, skip + limit);

    if (paginatedOffers.length === 0) {
      return NextResponse.json({
        success: true,
        offers: [],
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        subscription: { status: "inactive", hasActiveSubscription: false },
      });
    }

    const offerIds = paginatedOffers.map((o: any) => o.id);
    const uniqueRestIds = Array.from(new Set(paginatedOffers.map((o: any) => o.restaurant_id).filter(Boolean)));

    // Parallel fetch restaurants and redemption counts
    const [restaurantsRes, walletsRes] = await Promise.all([
      supabaseAdmin.from("restaurants").select("*").in("id", uniqueRestIds),
      supabaseAdmin
        .from("wallets")
        .select("offer_id")
        .in("offer_id", offerIds)
        .or("redeem_status.eq.true,offer_status.eq.redeemed"),
    ]);

    // Redemptions count map
    const redemptionMap = new Map<string, number>();
    (walletsRes.data || []).forEach((w: any) => {
      redemptionMap.set(w.offer_id, (redemptionMap.get(w.offer_id) || 0) + 1);
    });

    // Restaurant lookup map
    const restaurantMap = new Map<string, any>();
    (restaurantsRes.data || []).forEach((r: any) => restaurantMap.set(r.id, r));

    const firstRest = restaurantMap.get(targetRestaurantIds[0]) || null;
    const subscriptionStatus = firstRest?.subscription_status || "inactive";
    const hasActiveSubscription = subscriptionStatus === "active";

    // Format offers
    const offersWithRedemptions = paginatedOffers.map((offer: any) => {
      const restaurant = restaurantMap.get(offer.restaurant_id);
      const redeemCount = redemptionMap.get(offer.id) || offer.redeem_count || 0;

      const statusForCalc = offer.status === "pending" ? "inactive" : offer.status;
      const calculatedStatus = calculateOfferStatus(
        offer.start_date,
        offer.expiry_date,
        offer.run_until_further || false,
        offer.is_deactivated || false,
        statusForCalc
      );

      return {
        _id: offer.id,
        id: offer.id,
        title: offer.title,
        description: offer.description,
        validDays: offer.valid_days,
        validHours: offer.valid_hours,
        startDate: offer.start_date,
        expiryDate: offer.expiry_date,
        status: calculatedStatus,
        offerType: offer.offer_type,
        discountPercentage: offer.discount_percentage ?? null,
        freeItemName: offer.free_item_name ?? null,
        otherOfferDescription: offer.other_offer_description ?? null,
        terms: offer.terms,
        dineIn: offer.dine_in,
        dineOut: offer.dine_out,
        createdAt: offer.created_at,
        areas: [],
        restaurantId: offer.restaurant_id,
        restaurantName: restaurant?.name || null,
        associatedId: offer.associated_id,
        maxRedemptionLimit: offer.max_redemption_limit ?? null,
        isUnlimited: offer.is_unlimited ?? false,
        redeemCount,
      };
    });

    return NextResponse.json({
      success: true,
      offers: offersWithRedemptions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      subscription: {
        status: subscriptionStatus,
        hasActiveSubscription,
      },
    });
  } catch (error: any) {
    console.error("Fetch offers error:", error);
    return NextResponse.json({ message: "Failed to fetch offers", error: error.message }, { status: 500 });
  }
}

// POST endpoint to create a new offer
export async function POST(req: Request) {
  try {
    // Get auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    let restaurantId: string;
    let userId: string; // Added userId variable
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        restaurantId: string;
        role: string;
        userId: string;
      };


      restaurantId = decoded.restaurantId;
      userId = decoded.userId; // Use userId from the token

      // if (!restaurantId) {
      //   return NextResponse.json(
      //     { message: "Restaurant ID not found in token" },
      //     { status: 400 }
      //   );
      // }
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const {
      title,
      description,
      offerType,
      discountPercentage,
      freeItemName,
      otherOfferDescription,
      validDays,
      validHours,
      startDate,
      expiryDate,
      terms,
      dineIn,
      dineOut,
      restaurantId: reqRestaurantId,
      runUntilFurther,
      maxRedemptionLimit,
      isUnlimited,
      bookingRequirement,
      recurringType,
      recurringStartDate,
      tags,
    } = await req.json();

    const targetRestId = reqRestaurantId || restaurantId;

    const { data: restaurant, error: restError } = await supabaseAdmin
      .from("restaurants")
      .select("id, name")
      .eq("id", targetRestId)
      .maybeSingle();

    if (restError || !restaurant) {
      return NextResponse.json(
        { message: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Validate required fields
    if (
      !title ||
      !description ||
      !validDays ||
      !validHours) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!bookingRequirement) {
      return NextResponse.json(
        { message: "Booking requirement is required" },
        { status: 400 }
      );
    }

    // Calculate initial status based on dates (no pending status)
    const initialStatus = calculateOfferStatus(
      startDate,
      expiryDate,
      runUntilFurther || false,
      false, // Not deactivated initially
      undefined // No current status
    );

    const newOfferId = crypto.randomBytes(12).toString("hex");

    const { data: insertedOffer, error: insertError } = await supabaseAdmin
      .from("offers")
      .insert({
        id: newOfferId,
        restaurant_id: targetRestId,
        title,
        description,
        offer_type: offerType,
        discount_percentage: discountPercentage ?? null,
        free_item_name: freeItemName ?? null,
        other_offer_description: otherOfferDescription ?? null,
        valid_days: validDays,
        valid_hours: validHours,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
        terms: terms || "",
        dine_in: !!dineIn,
        dine_out: !!dineOut,
        status: initialStatus,
        associated_id: userId,
        run_until_further: !!runUntilFurther,
        max_redemption_limit: maxRedemptionLimit ?? null,
        is_unlimited: !!isUnlimited,
        booking_requirement: bookingRequirement,
        recurring_type: recurringType || null,
        recurring_start_date: recurringStartDate ? new Date(recurringStartDate).toISOString() : null,
        current_period_count: 0,
        last_reset_date: null,
        is_deactivated: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !insertedOffer) {
      console.error("Error inserting offer:", insertError);
      return NextResponse.json(
        { message: "Failed to create offer", error: insertError?.message },
        { status: 500 }
      );
    }

    // If tags are provided, insert them into offer_tags
    if (Array.isArray(tags) && tags.length > 0) {
      const tagRows = tags.map((tagId: string) => ({
        offer_id: newOfferId,
        tag_id: tagId,
      }));
      await supabaseAdmin.from("offer_tags").insert(tagRows);
    }

    // Send new offer submission email notification
    try {
      const emailHtml = await render(
        NewOfferSubmissionEmail({
          venueName: restaurant.name || "Unknown Restaurant",
          offerTitle: insertedOffer.title,
          offerDescription: insertedOffer.description,
          offerType: insertedOffer.offer_type,
          validDays: insertedOffer.valid_days,
          validHours: insertedOffer.valid_hours,
          startDate: insertedOffer.start_date,
          expiryDate: insertedOffer.expiry_date,
          termsAndConditions: insertedOffer.terms || "No terms and conditions specified",
          dineIn: insertedOffer.dine_in || false,
          dineOut: insertedOffer.dine_out || false,
          runUntilFurther: insertedOffer.run_until_further || false,
          submissionDate: new Date().toISOString(),
        })
      );

      await sendEmail(
        "offers@eatinout.com",
        "New Offer Submission",
        emailHtml
      );

      console.log("✅ New offer submission email sent successfully");
    } catch (emailError: any) {
      console.error("❌ Error sending new offer submission email:", emailError);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Offer created successfully",
        offer: {
          id: insertedOffer.id,
          title: insertedOffer.title,
          validDays: insertedOffer.valid_days,
          startDate: insertedOffer.start_date,
          expiryDate: insertedOffer.expiry_date,
          offerType: insertedOffer.offer_type,
          status: insertedOffer.status,
          associatedId: userId,
          runUntilFurther: insertedOffer.run_until_further,
          maxRedemptionLimit: insertedOffer.max_redemption_limit,
          isUnlimited: insertedOffer.is_unlimited,
          bookingRequirement: insertedOffer.booking_requirement,
          recurringType: insertedOffer.recurring_type,
          recurringStartDate: insertedOffer.recurring_start_date,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create offer error:", error);
    return NextResponse.json(
      { message: "Failed to create offer", error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    // Get auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    // let restaurantId: string;
    // try {
    //   const decoded = jwt.verify(token, JWT_SECRET) as {
    //     restaurantId: string;
    //     role: string;
    //   };

    //   if (decoded.role !== "restaurant") {
    //     return NextResponse.json(
    //       { message: "Unauthorized - Not a restaurant" },
    //       { status: 403 }
    //     );
    //   }

    //   restaurantId = decoded.restaurantId;

    //   if (!restaurantId) {
    //     return NextResponse.json(
    //       { message: "Restaurant ID not found in token" },
    //       { status: 400 }
    //     );
    //   }
    // } catch (error) {
    //   return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    // }

    // Parse request body
    const {
      id,
      title,
      description,
      offerType,
      discountPercentage,
      freeItemName,
      otherOfferDescription,
      validDays,
      validHours,
      startDate,
      expiryDate,
      terms,
      dineIn,
      dineOut,
      status, // Include status in the request body
      restaurantId,
      associatedId,
      runUntilFurther,
      maxRedemptionLimit,
      isUnlimited,
      bookingRequirement,
      recurringType,
      recurringStartDate,
      tags,
    } = await req.json();

    // Validate required fields
    if (
      !id ||
      !title ||
      !description ||
      !validDays ||
      !validHours
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!bookingRequirement) {
      return NextResponse.json(
        { message: "Booking requirement is required" },
        { status: 400 }
      );
    }

    // Get current offer to check deactivated status
    const { data: currentOffer, error: fetchErr } = await supabaseAdmin
      .from("offers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !currentOffer) {
      return NextResponse.json(
        { message: "Offer not found or unauthorized" },
        { status: 404 }
      );
    }

    // Calculate status based on dates and manual deactivation
    // If status is explicitly set to inactive, preserve it by setting deactivated flag
    const isManuallyInactive = status === "inactive" && currentOffer.status === "inactive";
    const finalDeactivated = isManuallyInactive || currentOffer.is_deactivated || false;

    // Map pending to inactive - no pending status
    const currentStatusForCalc = currentOffer.status === "pending" ? "inactive" : currentOffer.status;

    // Calculate status based on dates (unless manually set to inactive)
    const calculatedStatus = isManuallyInactive
      ? "inactive"
      : calculateOfferStatus(
        startDate,
        expiryDate,
        runUntilFurther || false,
        finalDeactivated,
        currentStatusForCalc // Preserve rejected only
      );

    // Update offer in Supabase
    const updatePayload: any = {
      title,
      description,
      offer_type: offerType,
      discount_percentage: discountPercentage ?? null,
      free_item_name: freeItemName ?? null,
      other_offer_description: otherOfferDescription ?? null,
      valid_days: validDays,
      valid_hours: validHours,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
      terms: terms || "",
      dine_in: !!dineIn,
      dine_out: !!dineOut,
      status: calculatedStatus,
      run_until_further: !!runUntilFurther,
      max_redemption_limit: maxRedemptionLimit ?? null,
      is_unlimited: !!isUnlimited,
      booking_requirement: bookingRequirement,
      recurring_type: recurringType || null,
      recurring_start_date: recurringStartDate ? new Date(recurringStartDate).toISOString() : null,
      is_deactivated: finalDeactivated,
      updated_at: new Date().toISOString(),
    };

    if (associatedId) updatePayload.associated_id = associatedId;
    if (restaurantId) updatePayload.restaurant_id = restaurantId;

    const { data: updatedOffer, error: updateErr } = await supabaseAdmin
      .from("offers")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr || !updatedOffer) {
      console.error("Update offer error:", updateErr);
      return NextResponse.json(
        { message: "Offer not found or unauthorized", error: updateErr?.message },
        { status: 404 }
      );
    }

    // Sync tags if provided
    if (Array.isArray(tags)) {
      await supabaseAdmin.from("offer_tags").delete().eq("offer_id", id);
      if (tags.length > 0) {
        const tagRows = tags.map((tagId: string) => ({
          offer_id: id,
          tag_id: tagId,
        }));
        await supabaseAdmin.from("offer_tags").insert(tagRows);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Offer updated successfully",
      offer: {
        id: updatedOffer.id,
        validDays: updatedOffer.valid_days,
        expiryDate: updatedOffer.expiry_date,
        status: updatedOffer.status,
        runUntilFurther: updatedOffer.run_until_further,
        bookingRequirement: updatedOffer.booking_requirement,
        maxRedemptionLimit: updatedOffer.max_redemption_limit,
        isUnlimited: updatedOffer.is_unlimited,
        recurringType: updatedOffer.recurring_type,
        recurringStartDate: updatedOffer.recurring_start_date,
      },
    });

  } catch (error: any) {
    console.error("Update offer error:", error);
    return NextResponse.json(
      { message: "Failed to update offer", error: error.message },
      { status: 500 }
    );
  }
}