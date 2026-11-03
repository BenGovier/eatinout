import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase/admin";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let restaurantId: string;
    let userId: string;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        restaurantId: string;
        role: string;
        userId: string;
      };

      if (decoded.role !== "restaurant") {
        return NextResponse.json(
          { message: "Unauthorized - Not a restaurant" },
          { status: 403 }
        );
      }

      restaurantId = decoded.restaurantId;
      userId = decoded.userId;

      if (!restaurantId && !userId) {
        return NextResponse.json(
          { message: "Restaurant ID not found in token" },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    // 1. Fetch user's restaurant IDs
    let targetRestaurantIds: string[] = [];
    if (restaurantId) {
      targetRestaurantIds.push(restaurantId);
    }

    if (userId) {
      const { data: userRestaurants } = await supabaseAdmin
        .from("restaurants")
        .select("id")
        .eq("user_id", userId);

      (userRestaurants || []).forEach((r: any) => {
        if (!targetRestaurantIds.includes(r.id)) {
          targetRestaurantIds.push(r.id);
        }
      });
    }

    // 2. Active offers count
    let activeOffersCount = 0;
    if (targetRestaurantIds.length > 0) {
      const { count } = await supabaseAdmin
        .from("offers")
        .select("id", { count: "exact", head: true })
        .in("restaurant_id", targetRestaurantIds)
        .eq("status", "active")
        .eq("is_deactivated", false);

      activeOffersCount = count || 0;
    }

    // 3. Total redemptions count
    // A wallet is considered redeemed when redeem_status = true (or offer_status = 'redeemed')
    let totalRedemptions = 0;
    let monthlyRedemptions = 0;
    let recentWallets: any[] = [];

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    if (targetRestaurantIds.length > 0) {
      // Total redemptions
      const { count: totalCount } = await supabaseAdmin
        .from("wallets")
        .select("id", { count: "exact", head: true })
        .in("restaurant_id", targetRestaurantIds)
        .or("redeem_status.eq.true,offer_status.eq.redeemed");

      totalRedemptions = totalCount || 0;

      // Monthly redemptions (current month)
      const { count: monthCount } = await supabaseAdmin
        .from("wallets")
        .select("id", { count: "exact", head: true })
        .in("restaurant_id", targetRestaurantIds)
        .or("redeem_status.eq.true,offer_status.eq.redeemed")
        .gte("created_at", startOfMonth);

      monthlyRedemptions = monthCount || 0;

      // Recent 5 redemptions
      const { data: recentData } = await supabaseAdmin
        .from("wallets")
        .select("id, redeem_code, redeem_status, redeem_code_expiry, offer_id, user_id, restaurant_id, created_at")
        .in("restaurant_id", targetRestaurantIds)
        .or("redeem_status.eq.true,offer_status.eq.redeemed")
        .order("created_at", { ascending: false })
        .limit(5);

      recentWallets = recentData || [];
    }

    // 4. Fetch details for recent redemptions (offer details + user details)
    const offerIds = Array.from(new Set(recentWallets.map((w: any) => w.offer_id).filter(Boolean)));
    const userIds = Array.from(new Set(recentWallets.map((w: any) => w.user_id).filter(Boolean)));

    const [offersRes, usersRes] = await Promise.all([
      offerIds.length > 0
        ? supabaseAdmin.from("offers").select("id, title, status, expiry_date").in("id", offerIds)
        : { data: [] },
      userIds.length > 0
        ? supabaseAdmin.from("users").select("id, first_name, last_name, email").in("id", userIds)
        : { data: [] },
    ]);

    const offersMap = new Map<string, any>();
    (offersRes.data || []).forEach((o: any) => offersMap.set(o.id, o));

    const usersMap = new Map<string, any>();
    (usersRes.data || []).forEach((u: any) => usersMap.set(u.id, u));

    const formattedActivity = recentWallets.map((wallet: any) => {
      const offer = offersMap.get(wallet.offer_id);
      const user = usersMap.get(wallet.user_id);

      let offerStatus = "Active";
      if (offer) {
        if (offer.expiry_date && new Date(offer.expiry_date) < now) {
          offerStatus = "Expired";
        } else if (offer.status) {
          offerStatus = offer.status.charAt(0).toUpperCase() + offer.status.slice(1);
        }
      }

      const userName = user
        ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "Unknown Customer"
        : "Unknown Customer";

      return {
        id: wallet.id,
        redeemCode: wallet.redeem_code,
        offerTitle: offer?.title || "Unknown Offer",
        offerStatus,
        userName,
        userEmail: user?.email || "",
        redeemedAt: wallet.created_at,
        redeemStatus: wallet.redeem_status,
        redeemCodeExpiry: wallet.redeem_code_expiry,
        offerRestaurantId: wallet.restaurant_id,
      };
    });

    return NextResponse.json({
      activeOffers: activeOffersCount,
      totalRedemptions,
      monthlyRedemptions,
      recentActivity: formattedActivity,
    });
  } catch (error: any) {
    console.error("Dashboard data error:", error);
    return NextResponse.json(
      { message: "Failed to fetch dashboard data", error: error.message },
      { status: 500 }
    );
  }
}