import { NextResponse } from "next/server";
import Stripe from "stripe";
import connectToDatabase from "@/lib/mongodb";
import Voucher from "@/models/Voucher";
import { verifyAdminToken } from "@/lib/auth-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// GET: Fetch all vouchers
export async function GET(req: Request) {
  try {
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json(
        { message: adminCheck.message },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Get pagination params from query
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const searchQuery = searchParams.get('search') || '';

    // Build search filter
    const searchFilter: any = {};
    if (searchQuery.trim()) {
      searchFilter.$or = [
        { code: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // Get total count with search filter
    const totalVouchers = await Voucher.countDocuments(searchFilter);

    // Get paginated vouchers with search filter
    const vouchers = await Voucher.find(searchFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Optimize: Return plain JavaScript objects instead of Mongoose documents

    // Fetch Stripe promo codes (all of them for now, can optimize later)
    const stripePromoCodes = await stripe.promotionCodes.list({ limit: 100 });

    // Optimize: Batch fetch all coupon data that needs to be retrieved
    const couponIdsToFetch: string[] = [];
    stripePromoCodes.data.forEach(promo => {
      if (typeof promo.coupon === "string") {
        couponIdsToFetch.push(promo.coupon);
      }
    });

    // Fetch all coupons in parallel
    const couponDataArray = await Promise.all(
      couponIdsToFetch.map(couponId => stripe.coupons.retrieve(couponId))
    );

    // Create a map of fetched coupons
    const fetchedCouponsMap = new Map<string, any>();
    couponDataArray.forEach(coupon => {
      fetchedCouponsMap.set(coupon.id, coupon);
    });

    // Build a lookup table for Stripe promo codes by ID
    const promoCodeMap = new Map<string, any>();

    for (const promo of stripePromoCodes.data) {
      let couponData = promo.coupon;
      if (typeof promo.coupon === "string") {
        couponData = fetchedCouponsMap.get(promo.coupon) || promo.coupon;
      }

      promoCodeMap.set(promo.id, {
        id: promo.id,
        code: promo.code,
        active: promo.active,
        created: promo.created,
        max_redemptions: promo.max_redemptions,
        times_redeemed: promo.times_redeemed,
        expires_at: promo.expires_at,
        coupon: {
          id: couponData.id,
          amount_off: couponData.amount_off,
          percent_off: couponData.percent_off,
          duration: couponData.duration,
          duration_in_months: couponData.duration_in_months,
          valid: couponData.valid,
        },
      });
    }

    // Merge Stripe `times_redeemed` into `currentUses`
    const enrichedVouchers = vouchers.map((voucher: any) => {
      const matchedPromo = voucher.stripePromotionCodeId
        ? promoCodeMap.get(voucher.stripePromotionCodeId)
        : null;

      return {
        ...voucher, // Already plain object due to .lean()
        currentUses: matchedPromo
          ? matchedPromo.times_redeemed
          : voucher.currentUses,
      };
    });

    return NextResponse.json({
      success: true,
      vouchers: enrichedVouchers,
      pagination: {
        page,
        limit,
        total: totalVouchers,
        totalPages: Math.ceil(totalVouchers / limit),
        hasMore: skip + vouchers.length < totalVouchers,
      },
      stripePromotionCodes: Array.from(promoCodeMap.values()),
    });
  } catch (error: any) {
    console.error("Error fetching vouchers or Stripe data:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch data" },
      { status: 500 }
    );
  }
}

// POST: Create a new voucher
// POST: Create a new voucher
export async function POST(req: Request) {
  try {
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json({ message: adminCheck.message }, { status: 401 });
    }

    await connectToDatabase();
    const data = await req.json();

    // Check DB first
    const existingVoucher = await Voucher.findOne({
      code: data.code.toUpperCase(),
    });
    if (existingVoucher) {
      return NextResponse.json(
        { success: false, message: "Voucher code already exists in database" },
        { status: 400 }
      );
    }

    // ✅ Check Stripe for existing promotion code
    const existingPromotion = await stripe.promotionCodes.list({
      code: data.code.toUpperCase(),
      limit: 1,
    });
    if (existingPromotion.data.length > 0) {
      const existingPromo = existingPromotion.data[0];
      const status = existingPromo.active ? "active" : "inactive";
      return NextResponse.json(
        { 
          success: false, 
          message: `Voucher code already exists in Stripe (${status}). Please use a different code.` 
        },
        { status: 400 }
      );
    }

    const basePrice = 4.99;
    let percentOff = 0;
    if (data.discountType === "percentage") {
      percentOff = Number(data.discountValue);
    } else if (data.discountType === "fixed") {
      percentOff = Number(((data.discountValue / basePrice) * 100).toFixed(2));
    }
    percentOff = Math.min(percentOff, 100);

    // Resolve expiry
    let expiresAtUnix: number | undefined;
    if (data.validityDays) {
      const resolvedDate = new Date(Date.now() + data.validityDays * 24 * 60 * 60 * 1000);
      expiresAtUnix = Math.floor(resolvedDate.getTime() / 1000);
    } else if (data.expiryDate) {
      expiresAtUnix = Math.floor(new Date(data.expiryDate).getTime() / 1000);
    }

    // Create Stripe coupon
    const coupon = await stripe.coupons.create({
      percent_off: percentOff,
      duration: data.duration || "once",
      ...(data.duration === "repeating" && data.durationInMonths
        ? { duration_in_months: data.durationInMonths }
        : {}),
    });

    // Create Stripe promotion code safely
    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: data.code.toUpperCase(),
      ...(data.maxUses ? { max_redemptions: data.maxUses } : {}),
      ...(expiresAtUnix ? { expires_at: expiresAtUnix } : {}),
    });

    // Save voucher in DB
    const voucher = new Voucher({
      ...data,
      code: data.code.toUpperCase(),
      currentUses: 0,
      stripeCouponId: coupon.id,
      stripePromotionCodeId: promotionCode.id,
      calculatedPercentOff: percentOff,
    });

    await voucher.save();

    return NextResponse.json(
      { success: true, message: "Voucher created successfully", voucher },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating voucher:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create voucher" },
      { status: 500 }
    );
  }
}



// PUT: Update an existing voucher// PUT: Update an existing voucher
export async function PUT(req: Request) {
  try {
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json({ message: adminCheck.message }, { status: 401 });
    }

    await connectToDatabase();
    const data = await req.json();

    const voucher = await Voucher.findById(data._id);
    if (!voucher) {
      return NextResponse.json(
        { success: false, message: "Voucher not found" },
        { status: 404 }
      );
    }

    const basePrice = 4.99;
    let percentOff = 0;
    if (data.discountType === "percentage") {
      percentOff = Number(data.discountValue);
    } else if (data.discountType === "fixed") {
      percentOff = Number(((data.discountValue / basePrice) * 100).toFixed(2));
    }
    percentOff = Math.min(percentOff, 100);

    // ✅ Resolve expiry again
    let expiresAtUnix: number | undefined;
    if (data.validityDays) {
      const resolvedDate = new Date(Date.now() + data.validityDays * 24 * 60 * 60 * 1000);
      expiresAtUnix = Math.floor(resolvedDate.getTime() / 1000);
    } else if (data.expiryDate) {
      expiresAtUnix = Math.floor(new Date(data.expiryDate).getTime() / 1000);
    }

    // Create new coupon in Stripe
    const newCoupon = await stripe.coupons.create({
      percent_off: percentOff,
      duration: data.duration || "once",
      ...(data.duration === "repeating" && data.durationInMonths
        ? { duration_in_months: data.durationInMonths }
        : {}),
    });

    // Deactivate old promo if exists
    if (voucher.stripePromotionCodeId) {
      try {
        await stripe.promotionCodes.update(voucher.stripePromotionCodeId, { active: false });
      } catch (e) {
        console.warn("Failed to deactivate old promo code:", e);
      }
    }

    // Create new promo code
    const newPromo = await stripe.promotionCodes.create({
      coupon: newCoupon.id,
      code: data.code.toUpperCase(),
      ...(data.maxUses ? { max_redemptions: data.maxUses } : {}),
      ...(expiresAtUnix ? { expires_at: expiresAtUnix } : {}),
    });

    // Update voucher in DB
    Object.assign(voucher, {
      ...data,
      code: data.code.toUpperCase(),
      stripeCouponId: newCoupon.id,
      stripePromotionCodeId: newPromo.id,
      calculatedPercentOff: percentOff,
    });

    await voucher.save();

    return NextResponse.json({
      success: true,
      message: "Voucher and Stripe coupon updated successfully",
      voucher,
    });
  } catch (error: any) {
    console.error("Error updating voucher:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update voucher" },
      { status: 500 }
    );
  }
}

