import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  CLAIM_TOKEN_TTL_SECONDS,
  DB,
  computeVoucherExpiry,
  getAuthenticatedCustomer,
  getLondonWeekBounds,
  getVoucherSettings,
  hasWeeklyV2CutoverBegun,
  isWeeklyLimitedOffer,
  signClaimIntent,
} from "@/lib/weekly-vouchers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

type PreviewStatus =
  | "available"
  | "claims_closed"
  | "offer_unavailable"
  | "offer_expired"
  | "already_claimed"
  | "sold_out";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

// Read-only: never calls the claim function, never writes or reserves anything.
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer();
    if (!auth.ok) return json({ error: auth.error }, auth.status);
    const { userId } = auth.customer;

    const offerId = req.nextUrl.searchParams.get("offerId");
    if (!offerId) return json({ error: "Missing offerId", code: "bad_request" }, 400);

    const [offerRes, settings, bounds] = await Promise.all([
      supabaseAdmin
        .from("offers")
        .select(
          "id, title, restaurant_id, status, is_deactivated, start_date, expiry_date, run_until_further, recurring_type, max_redemption_limit, is_unlimited"
        )
        .eq("id", offerId)
        .maybeSingle(),
      getVoucherSettings(),
      getLondonWeekBounds(),
    ]);

    if (offerRes.error) {
      console.error("Error fetching offer for claim preview:", offerRes.error);
      return json({ error: "Internal server error" }, 500);
    }
    const offer = offerRes.data;
    if (!offer) return json({ error: "Offer not found", code: "not_found" }, 404);

    if (!isWeeklyLimitedOffer(offer)) {
      return json(
        { error: "Offer is not a weekly limited voucher", code: "not_weekly_limited" },
        409
      );
    }
    if (!settings || !bounds) {
      return json({ error: "Weekly vouchers are temporarily unavailable" }, 503);
    }

    const { periodStart, periodEnd } = bounds;

    const [restaurantRes, availabilityRes, taggedClaimRes, legacyClaimRes] =
      await Promise.all([
        offer.restaurant_id
          ? supabaseAdmin
              .from("restaurants")
              .select("id, name")
              .eq("id", offer.restaurant_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabaseAdmin
          .from(DB.availabilityView)
          .select("max_redemption_limit, claimed_this_week, remaining_this_week")
          .eq("offer_id", offerId)
          .maybeSingle(),
        supabaseAdmin
          .from("wallets")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("offer_id", offerId)
          .eq("period_start", periodStart),
        supabaseAdmin
          .from("wallets")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("offer_id", offerId)
          .eq("entry_kind", "voucher")
          .is("period_start", null)
          .gte("created_at", periodStart)
          .lt("created_at", periodEnd),
      ]);

    const queryError =
      availabilityRes.error || taggedClaimRes.error || legacyClaimRes.error;
    if (queryError) {
      console.error("Error building claim preview:", queryError);
      return json({ error: "Internal server error" }, 500);
    }

    const weeklyLimit: number =
      availabilityRes.data?.max_redemption_limit ?? offer.max_redemption_limit;
    const claimedThisWeek: number = availabilityRes.data?.claimed_this_week ?? 0;
    const remaining: number = Math.max(
      0,
      availabilityRes.data?.remaining_this_week ?? weeklyLimit - claimedThisWeek
    );
    const alreadyClaimed =
      (taggedClaimRes.count ?? 0) + (legacyClaimRes.count ?? 0) > 0;

    const voucherExpiresAt = computeVoucherExpiry(periodEnd, offer);
    const now = new Date();

    let status: PreviewStatus = "available";
    if (!settings.weeklyClaimsEnabled || !hasWeeklyV2CutoverBegun(settings, now)) {
      status = "claims_closed";
    } else if (
      offer.is_deactivated ||
      offer.status !== "active" ||
      (offer.start_date && new Date(offer.start_date) > now)
    ) {
      status = "offer_unavailable";
    } else if (new Date(voucherExpiresAt) <= now) {
      status = "offer_expired";
    } else if (alreadyClaimed) {
      status = "already_claimed";
    } else if (remaining <= 0) {
      status = "sold_out";
    }

    let claimToken: string | null = null;
    let claimTokenExpiresAt: string | null = null;
    if (status === "available") {
      const previewIssuedAt = now.toISOString();
      claimToken = signClaimIntent({
        userId,
        offerId,
        periodStart,
        expiresAt: voucherExpiresAt,
        previewIssuedAt,
      });
      claimTokenExpiresAt = new Date(
        now.getTime() + CLAIM_TOKEN_TTL_SECONDS * 1000
      ).toISOString();
    }

    return json({
      status,
      cutoverActive: hasWeeklyV2CutoverBegun(settings, now),
      offer: {
        id: offer.id,
        title: offer.title,
        restaurantId: offer.restaurant_id ?? null,
        restaurantName: restaurantRes.data?.name ?? null,
      },
      weeklyLimit,
      claimedThisWeek,
      remaining,
      period: { start: periodStart, end: periodEnd },
      voucherExpiresAt,
      alreadyClaimed,
      claimToken,
      claimTokenExpiresAt,
    });
  } catch (error) {
    console.error("Error building claim preview:", error);
    return json({ error: "Internal server error" }, 500);
  }
}
