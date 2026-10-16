import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// POST: Add offer to user's wallet
export async function POST(req: NextRequest) {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication token required" },
        { status: 401 }
      );
    }

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      userId: string;
      email: string;
      role: string;
      firstName: string;
      lastName: string;
      restaurantId?: string;
      subscriptionStatus?: string;
    };

    const { offerId, offerStatus, offerRestaurantId } = await req.json();

    if (!offerId || !offerStatus) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (decodedToken.role !== "user") {
      return NextResponse.json(
        { error: "Only users can redeem offers" },
        { status: 403 }
      );
    }

    // 1. Fetch offer details from Supabase
    const { data: offer, error: offerError } = await supabaseAdmin
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .maybeSingle();

    if (offerError || !offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // 2. Check and handle recurring limit reset
    let currentPeriodCount = offer.current_period_count || 0;
    const maxRedemptionLimit = offer.max_redemption_limit;
    const recurringType = offer.recurring_type;

    if (
      maxRedemptionLimit &&
      maxRedemptionLimit > 0 &&
      recurringType &&
      recurringType !== "never"
    ) {
      const now = new Date();
      const lastReset =
        offer.last_reset_date || offer.recurring_start_date || offer.created_at;

      let shouldReset = false;
      if (recurringType === "weekly") {
        const daysSinceReset = Math.floor(
          (now.getTime() - new Date(lastReset).getTime()) / (1000 * 60 * 60 * 24)
        );
        shouldReset = daysSinceReset >= 7;
      } else if (recurringType === "monthly") {
        const daysSinceReset = Math.floor(
          (now.getTime() - new Date(lastReset).getTime()) / (1000 * 60 * 60 * 24)
        );
        shouldReset = daysSinceReset >= 30;
      }

      if (shouldReset) {
        currentPeriodCount = 0;
        await supabaseAdmin
          .from("offers")
          .update({
            current_period_count: 0,
            last_reset_date: now.toISOString(),
          })
          .eq("id", offerId);
      }
    }

    // 3. Check if offer has reached redemption limit
    if (maxRedemptionLimit && maxRedemptionLimit > 0) {
      const currentCount =
        recurringType && recurringType !== "never"
          ? currentPeriodCount
          : offer.redeem_count || 0;

      if (currentCount >= maxRedemptionLimit) {
        const resetMessage =
          recurringType === "weekly"
            ? "This offer will reset weekly."
            : recurringType === "monthly"
            ? "This offer will reset monthly."
            : "Please check back later or explore other offers.";

        return NextResponse.json(
          {
            error: "Offer fully claimed",
            message: `This offer has reached its redemption limit. ${resetMessage}`,
          },
          { status: 410 }
        );
      }
    }

    // 4. Generate a unique redeem code
    const redeemCode = crypto
      .createHash("sha256")
      .update(offerId + Date.now().toString())
      .digest("hex")
      .substring(0, 8)
      .toUpperCase();

    // Generate unique ID for wallet
    const walletId = crypto.randomUUID().replace(/-/g, "").substring(0, 24);
    const targetRestaurantId = offerRestaurantId || offer.restaurant_id;

    const { data: newWallet, error: insertError } = await supabaseAdmin
      .from("wallets")
      .insert({
        id: walletId,
        user_id: decodedToken.userId,
        offer_id: offerId,
        restaurant_id: targetRestaurantId,
        offer_status: offerStatus,
        redeem_code: redeemCode,
        redeem_status: false,
      })
      .select("id, redeem_code")
      .single();

    if (insertError) {
      console.error("Error creating wallet entry:", insertError);
      return NextResponse.json(
        { error: "Failed to add offer to wallet: " + insertError.message },
        { status: 500 }
      );
    }

    // 5. Increment redeem_count and current_period_count on offer
    const newRedeemCount = (offer.redeem_count || 0) + 1;
    const updatePayload: any = { redeem_count: newRedeemCount };

    if (recurringType && recurringType !== "never") {
      updatePayload.current_period_count = currentPeriodCount + 1;
    }

    await supabaseAdmin.from("offers").update(updatePayload).eq("id", offerId);

    return NextResponse.json(
      {
        message: "Wallet entry created successfully",
        redeemCode: newWallet.redeem_code,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating wallet entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Fetch user's active and redeemed offers in wallet
export async function GET(req: Request) {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication token required" },
        { status: 401 }
      );
    }

    let decodedToken: { userId: string; role: string };
    try {
      decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as {
        userId: string;
        role: string;
      };
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // 1. Fetch wallet entries for the user
    const { data: walletEntriesData, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("id, user_id, offer_id, restaurant_id, offer_status, redeem_code, redeem_code_expiry, redeem_status, created_at, updated_at")
      .eq("user_id", decodedToken.userId)
      .order("created_at", { ascending: false });

    if (walletError) {
      console.error("Error fetching wallet entries:", walletError);
      return NextResponse.json(
        { error: "Database error fetching wallet" },
        { status: 500 }
      );
    }

    const walletEntries = walletEntriesData || [];
    if (walletEntries.length === 0) {
      return NextResponse.json(
        {
          redeemed: [],
          active: [],
          pagination: {
            redeemed: { total: 0, page, limit, totalPages: 0 },
            active: { total: 0, page, limit, totalPages: 0 },
          },
        },
        { status: 200 }
      );
    }

    // 2. Fetch user phone
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("mobile")
      .eq("id", decodedToken.userId)
      .maybeSingle();

    const userPhone = userData?.mobile || null;

    // 3. Collect offer IDs and restaurant IDs
    const offerIds = Array.from(new Set(walletEntries.map((w: any) => w.offer_id).filter(Boolean)));
    const restaurantIds = Array.from(
      new Set(walletEntries.map((w: any) => w.restaurant_id).filter(Boolean))
    );

    // 4. Fetch offers, restaurants, categories, and images in parallel
    const [offersRes, restaurantsRes, imagesRes, categoriesRes] = await Promise.all([
      offerIds.length > 0
        ? supabaseAdmin.from("offers").select("*").in("id", offerIds)
        : { data: [] },
      restaurantIds.length > 0
        ? supabaseAdmin.from("restaurants").select("*").in("id", restaurantIds)
        : { data: [] },
      restaurantIds.length > 0
        ? supabaseAdmin
            .from("restaurant_images")
            .select("restaurant_id, image_url, display_order")
            .in("restaurant_id", restaurantIds)
            .order("display_order", { ascending: true })
        : { data: [] },
      restaurantIds.length > 0
        ? supabaseAdmin
            .from("restaurant_categories")
            .select("restaurant_id, category_id, categories(id, name)")
            .in("restaurant_id", restaurantIds)
        : { data: [] },
    ]);

    // Map offers by ID
    const offersMap = new Map<string, any>();
    (offersRes.data || []).forEach((o: any) => offersMap.set(o.id, o));

    // Map images by restaurant ID
    const imagesByRest = new Map<string, string[]>();
    (imagesRes.data || []).forEach((img: any) => {
      if (!imagesByRest.has(img.restaurant_id)) {
        imagesByRest.set(img.restaurant_id, []);
      }
      imagesByRest.get(img.restaurant_id)!.push(img.image_url);
    });

    // Map categories by restaurant ID
    const categoriesByRest = new Map<string, any[]>();
    (categoriesRes.data || []).forEach((rc: any) => {
      if (!categoriesByRest.has(rc.restaurant_id)) {
        categoriesByRest.set(rc.restaurant_id, []);
      }
      if (rc.categories) {
        categoriesByRest.get(rc.restaurant_id)!.push(rc.categories);
      }
    });

    // Map restaurants by ID
    const restaurantsMap = new Map<string, any>();
    (restaurantsRes.data || []).forEach((r: any) => {
      restaurantsMap.set(r.id, {
        _id: r.id,
        id: r.id,
        name: r.name,
        address: r.address,
        city: r.city,
        zipCode: r.zip_code ? r.zip_code.toUpperCase() : "",
        addressLink: r.address_link,
        dineIn: r.dine_in,
        dineOut: r.dine_out,
        category: categoriesByRest.get(r.id) || [],
        images: imagesByRest.get(r.id) || [],
        phone: r.phone,
        email: r.email,
        website: r.website,
        deliveryAvailable: r.delivery_available,
      });
    });

    const now = new Date();
    const redeemedOffersAll: any[] = [];
    const activeOffersAll: any[] = [];

    for (const walletEntry of walletEntries) {
      const offer = offersMap.get(walletEntry.offer_id);
      if (!offer) continue;

      const expiryDate = offer.expiry_date ? new Date(offer.expiry_date) : null;
      const isExpired = expiryDate && expiryDate <= now;

      if (expiryDate && isExpired) continue; // skip fully expired offers

      const redeemCodeExpiry = walletEntry.redeem_code_expiry
        ? new Date(walletEntry.redeem_code_expiry)
        : null;
      const isRedeemCodeExpired = redeemCodeExpiry && redeemCodeExpiry <= now;

      const restId = walletEntry.restaurant_id || offer.restaurant_id;
      const restaurant = restaurantsMap.get(restId) || null;

      const offerData = {
        _id: offer.id,
        id: offer.id,
        title: offer.title,
        description: offer.description,
        startDate: offer.start_date,
        expiryDate: offer.expiry_date,
        validDays: offer.valid_days,
        validHours: offer.valid_hours,
        discountPercentage: offer.discount_percentage,
        offerType: offer.offer_type,
        redeemCount: offer.redeem_count,
        maxRedemptionLimit: offer.max_redemption_limit,
        isUnlimited: offer.is_unlimited,
        bookingRequirement: offer.booking_requirement || "mandatory",
        redeemed: true,
        redeemCode: walletEntry.redeem_code,
        redeemStatus: walletEntry.redeem_status,
        redeemCodeExpiry: walletEntry.redeem_code_expiry,
        walletId: walletEntry.id,
        isRedeemCodeExpired,
        phone: restaurant?.phone || null,
        userPhone: userPhone,
        restaurant: restaurant,
      };

      if (walletEntry.redeem_status === true && isRedeemCodeExpired) {
        redeemedOffersAll.push(offerData);
      } else {
        activeOffersAll.push(offerData);
      }
    }

    // Paginate separately
    const redeemedOffers = redeemedOffersAll.slice(skip, skip + limit);
    const activeOffers = activeOffersAll.slice(skip, skip + limit);

    return NextResponse.json(
      {
        redeemed: redeemedOffers,
        active: activeOffers,
        pagination: {
          redeemed: {
            total: redeemedOffersAll.length,
            page,
            limit,
            totalPages: Math.ceil(redeemedOffersAll.length / limit),
          },
          active: {
            total: activeOffersAll.length,
            page,
            limit,
            totalPages: Math.ceil(activeOffersAll.length / limit),
          },
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching wallet data:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
