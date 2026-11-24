import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStorageUrl } from "@/lib/storage-url";
import {
  DB,
  type ClaimResult,
  generateRedeemCode,
  generateWalletId,
  getVoucherSettings,
  hasWeeklyV2CutoverBegun,
  isWeeklyLimitedOffer,
  verifyClaimIntent,
} from "@/lib/weekly-vouchers";
import { checkPremiumAccess } from "@/lib/membership";
import {
  SAVED_OFFER_STATUS,
  isExistingOffer,
  isSavedOfferEntry,
  normalizeOfferClassification,
} from "@/lib/offer-classification";

export const dynamic = "force-dynamic";

const CLAIM_FAILURES: Record<
  Exclude<ClaimResult, "claimed">,
  { status: number; message: string }
> = {
  bad_request: { status: 400, message: "The claim request was invalid." },
  claims_closed: { status: 503, message: "Weekly voucher claims are currently closed." },
  not_found: { status: 404, message: "Offer not found." },
  not_weekly_limited: {
    status: 409,
    message: "This offer has changed. Please refresh and try again.",
  },
  offer_unavailable: { status: 410, message: "This offer is not currently available." },
  offer_expired: { status: 410, message: "This offer has expired." },
  period_changed: {
    status: 409,
    message: "A new voucher week has started. Please review the voucher again.",
  },
  preview_expired: {
    status: 409,
    message: "This confirmation has expired. Please review the voucher again.",
  },
  already_claimed: {
    status: 409,
    message: "You have already claimed this voucher this week.",
  },
  sold_out: {
    status: 410,
    message: "All vouchers for this week have been claimed. It resets on Monday.",
  },
};

function claimFailure(code: Exclude<ClaimResult, "claimed">) {
  const { status, message } = CLAIM_FAILURES[code];
  return NextResponse.json({ error: message, message, code }, { status });
}

async function claimWeeklyVoucherV2(
  userId: string,
  offerId: string,
  claimToken: unknown
) {
  if (typeof claimToken !== "string" || !claimToken) {
    return NextResponse.json(
      {
        error: "Claim confirmation required",
        message: "Please confirm this voucher before claiming it.",
        code: "confirmation_required",
      },
      { status: 428 }
    );
  }

  const verification = verifyClaimIntent(claimToken);
  if (!verification.ok) {
    return verification.reason === "expired"
      ? claimFailure("preview_expired")
      : claimFailure("bad_request");
  }
  const { intent } = verification;
  if (intent.userId !== userId || intent.offerId !== offerId) {
    return claimFailure("bad_request");
  }

  // One retry with fresh identifiers if a generated ID/code collides; the
  // function rejects duplicate claims itself, so a retry cannot double-claim.
  for (let attempt = 0; attempt < 2; attempt++) {
    const walletId = generateWalletId();
    const redeemCode = generateRedeemCode();

    const { data, error } = await supabaseAdmin.rpc(DB.claimFn, {
      p_user_id: userId,
      p_offer_id: offerId,
      p_wallet_id: walletId,
      p_redeem_code: redeemCode,
      p_expected_period_start: intent.periodStart,
      p_expected_expires_at: intent.expiresAt,
      p_preview_issued_at: intent.previewIssuedAt,
    });

    if (error) {
      if (error.code === "23505" && attempt === 0) continue;
      console.error("Error calling claim_weekly_voucher:", error);
      return NextResponse.json(
        { error: "Failed to add offer to wallet" },
        { status: 500 }
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    const result = row?.result as ClaimResult | undefined;

    if (result === "claimed") {
      return NextResponse.json(
        {
          message: "Wallet entry created successfully",
          code: "claimed",
          redeemCode,
          walletId,
          periodStart: row.period_start,
          voucherExpiresAt: row.voucher_expires_at,
          remaining: row.remaining,
        },
        { status: 201 }
      );
    }
    if (result && result in CLAIM_FAILURES) {
      return claimFailure(result);
    }

    console.error("Unexpected claim_weekly_voucher result:", row);
    return NextResponse.json(
      { error: "Failed to add offer to wallet" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: "Failed to add offer to wallet" },
    { status: 500 }
  );
}

// Informational save for an Existing restaurant offer: no code, no counters,
// no weekly allocation, and never routed through claim_weekly_voucher.
async function saveExistingOffer(userId: string, offer: any) {
  // wallets_weekly_insert_guard rejects direct inserts for weekly-limited
  // offers, so a reclassified offer that still carries weekly limits is refused
  // here with a clear message rather than failing inside the database.
  if (isWeeklyLimitedOffer(offer)) {
    return NextResponse.json(
      {
        error: "Offer unavailable",
        code: "existing_offer_weekly_limited",
        message: "This offer can't be saved right now. Please check back later.",
      },
      { status: 409 }
    );
  }
  if (offer.is_deactivated || offer.status === "rejected") {
    return NextResponse.json(
      { error: "Offer unavailable", code: "offer_unavailable", message: "This offer is no longer available." },
      { status: 410 }
    );
  }

  const savedResponse = (alreadySaved: boolean) =>
    NextResponse.json(
      {
        message: alreadySaved ? "Offer already saved to your wallet" : "Offer saved to your wallet",
        saved: true,
        alreadySaved,
        entryKind: "saved_offer",
        redeemCode: null,
      },
      { status: alreadySaved ? 200 : 201 }
    );

  const { data: existingEntry, error: lookupError } = await supabaseAdmin
    .from("wallets")
    .select("id")
    .eq("user_id", userId)
    .eq("offer_id", offer.id)
    .eq("entry_kind", "saved_offer")
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("Error checking saved offer:", lookupError);
    return NextResponse.json({ error: "Failed to save offer" }, { status: 500 });
  }
  if (existingEntry) return savedResponse(true);

  const { error: insertError } = await supabaseAdmin.from("wallets").insert({
    id: crypto.randomUUID().replace(/-/g, "").substring(0, 24),
    user_id: userId,
    offer_id: offer.id,
    restaurant_id: offer.restaurant_id || null,
    offer_status: SAVED_OFFER_STATUS,
    redeem_code: null,
    redeem_status: false,
    entry_kind: "saved_offer",
  });

  if (insertError) {
    if (insertError.code === "23505") return savedResponse(true);
    console.error("Error saving existing offer:", insertError);
    return NextResponse.json({ error: "Failed to save offer" }, { status: 500 });
  }

  return savedResponse(false);
}

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

    let decodedToken: { userId: string; role: string };
    try {
      decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as { userId: string; role: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }
    if (!decodedToken?.userId) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const { offerId, offerStatus, offerRestaurantId, claimToken } = await req.json();

    if (!offerId || typeof offerId !== "string") {
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

    const access = await checkPremiumAccess(decodedToken.userId);
    if (access.status === "unverifiable") {
      console.error("[wallet] Premium entitlement check failed:", access.reason);
      return NextResponse.json(
        {
          error: "entitlement_unverifiable",
          message: "We couldn't confirm your membership right now. Please try again shortly.",
        },
        { status: 503 }
      );
    }
    if (access.status !== "granted") {
      return NextResponse.json(
        {
          error: "premium_required",
          message: "This offer is for Premium members. Upgrade to Premium to redeem it.",
        },
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

    // Classification comes only from the stored offer, never from the request.
    if (isExistingOffer(offer)) {
      return saveExistingOffer(decodedToken.userId, offer);
    }

    if (!offerStatus && !claimToken) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (isWeeklyLimitedOffer(offer)) {
      const settings = await getVoucherSettings();
      if (!settings) {
        return NextResponse.json(
          {
            error: "Weekly vouchers are temporarily unavailable",
            code: "claims_closed",
          },
          { status: 503 }
        );
      }
      // Once the cutover time is reached, weekly claims only go through the
      // atomic database function; the legacy path below is never used for them.
      if (hasWeeklyV2CutoverBegun(settings)) {
        return claimWeeklyVoucherV2(decodedToken.userId, offerId, claimToken);
      }
    }

    if (!offerStatus) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
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

    // Use verified restaurant_id from the offer in the database to prevent FK constraint failures
    let targetRestaurantId = offer.restaurant_id || null;
    if (!targetRestaurantId && offerRestaurantId) {
      const { data: restCheck } = await supabaseAdmin
        .from("restaurants")
        .select("id")
        .eq("id", offerRestaurantId)
        .maybeSingle();
      if (restCheck) {
        targetRestaurantId = restCheck.id;
      }
    }

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
      .select("id, user_id, offer_id, restaurant_id, offer_status, redeem_code, redeem_code_expiry, redeem_status, period_start, voucher_expires_at, retired_at, entry_kind, created_at, updated_at")
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
      const url = getStorageUrl(img.image_url);
      if (url) {
        if (!imagesByRest.has(img.restaurant_id)) {
          imagesByRest.set(img.restaurant_id, []);
        }
        imagesByRest.get(img.restaurant_id)!.push(url);
      }
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

    // Saved wallet entries must not expose a usable code without current entitlement.
    const access = await checkPremiumAccess(decodedToken.userId);
    if (access.status === "unverifiable") {
      console.error("[wallet] Premium entitlement check failed:", access.reason);
    }
    const canSeeCodes = access.status === "granted";

    const now = new Date();
    const redeemedOffersAll: any[] = [];
    const activeOffersAll: any[] = [];

    // Legacy weekly vouchers (no stored expiry) only become unusable once the
    // cutover has begun, so settings are read only when one is present.
    const hasLegacyWeekly = walletEntries.some((w: any) => {
      const o = offersMap.get(w.offer_id);
      return o && isWeeklyLimitedOffer(o) && !(w.period_start && w.voucher_expires_at);
    });
    const voucherSettings = hasLegacyWeekly ? await getVoucherSettings() : null;
    const legacyWeeklyRetired =
      voucherSettings !== null && hasWeeklyV2CutoverBegun(voucherSettings, now);

    for (const walletEntry of walletEntries) {
      const offer = offersMap.get(walletEntry.offer_id);
      if (!offer) continue;

      const expiryDate = offer.expiry_date ? new Date(offer.expiry_date) : null;
      const isExpired = expiryDate && expiryDate <= now;

      // Weekly V2 vouchers carry their own saved expiry; they move to history
      // rather than disappearing so the record stays visible to the customer.
      const voucherExpiresAt: string | null = walletEntry.voucher_expires_at ?? null;
      const isWeeklyVoucher = Boolean(walletEntry.period_start && voucherExpiresAt);
      const isVoucherExpired =
        isWeeklyVoucher && new Date(voucherExpiresAt as string) <= now;
      const retiredAt: string | null = walletEntry.retired_at ?? null;
      // The entry's own kind decides how it is shown, so a later change to the
      // offer's classification never turns a voucher into a saved offer or back.
      const isSavedOffer = isSavedOfferEntry(walletEntry);
      const isWeeklyLimited = !isSavedOffer && isWeeklyLimitedOffer(offer);

      let voucherState: "active" | "expired" | "retired" | "unavailable" | null = null;
      if (isWeeklyLimited) {
        if (retiredAt) voucherState = "retired";
        else if (isWeeklyVoucher) voucherState = isVoucherExpired ? "expired" : "active";
        else voucherState = legacyWeeklyRetired ? "unavailable" : "active";
      }

      if (expiryDate && isExpired && !isWeeklyVoucher) continue; // skip fully expired offers

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
        terms: offer.terms ?? null,
        offerClassification: normalizeOfferClassification(offer.offer_classification),
        entryKind: isSavedOffer ? "saved_offer" : "voucher",
        isSavedOffer,
        redeemed: true,
        redeemCode: canSeeCodes && !isSavedOffer ? walletEntry.redeem_code : null,
        premiumRequired: !canSeeCodes,
        redeemStatus: isSavedOffer ? false : walletEntry.redeem_status,
        redeemCodeExpiry: isSavedOffer ? null : walletEntry.redeem_code_expiry,
        walletId: walletEntry.id,
        isRedeemCodeExpired: isSavedOffer ? false : isRedeemCodeExpired,
        isWeeklyVoucher,
        voucherExpiresAt,
        isVoucherExpired,
        retiredAt,
        voucherState,
        phone: restaurant?.phone || null,
        userPhone: userPhone,
        restaurant: restaurant,
      };

      // A code already revealed keeps its running timer in Active; otherwise an
      // unusable weekly voucher moves to history so it is never shown as valid.
      const weeklyInHistory =
        voucherState !== null &&
        (walletEntry.redeem_status === true
          ? Boolean(isRedeemCodeExpired)
          : voucherState !== "active");

      if (isSavedOffer) {
        activeOffersAll.push(offerData);
      } else if (weeklyInHistory || (walletEntry.redeem_status === true && isRedeemCodeExpired)) {
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
        premiumAccess: access.status,
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
