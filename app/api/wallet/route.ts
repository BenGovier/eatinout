import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectToDatabase from "@/lib/mongodb";
import { Wallet } from "@/models/Wallet";
import jwt from "jsonwebtoken";
import Offer from "@/models/Offer";
import Restaurant from "@/models/Restaurant";
import User from "@/models/User";

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

    // Decode token to get userId
    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      userId: string;
      email: string;
      role: string;
      firstName: string;
      lastName: string;
      restaurantId: string;
      subscriptionStatus: string;
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


    await connectToDatabase();
    
    // Fetch offer details first to check limits
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Check and handle recurring limit reset
    if (offer.maxRedemptionLimit && offer.maxRedemptionLimit > 0 && offer.recurringType && offer.recurringType !== "never") {
      const now = new Date();
      const lastReset = offer.lastResetDate || offer.recurringStartDate || offer.createdAt;
      
      let shouldReset = false;
      
      if (offer.recurringType === "weekly") {
        // Check if 7 days have passed
        const daysSinceReset = Math.floor((now.getTime() - new Date(lastReset).getTime()) / (1000 * 60 * 60 * 24));
        shouldReset = daysSinceReset >= 7;
      } else if (offer.recurringType === "monthly") {
        // Check if a month has passed (30 days)
        const daysSinceReset = Math.floor((now.getTime() - new Date(lastReset).getTime()) / (1000 * 60 * 60 * 24));
        shouldReset = daysSinceReset >= 30;
      }
      
      if (shouldReset) {
        // Reset the counter
        await Offer.findByIdAndUpdate(
          offerId,
          { 
            currentPeriodCount: 0,
            lastResetDate: now 
          },
          { new: true }
        );
        // Refresh offer data
        const updatedOffer = await Offer.findById(offerId);
        if (updatedOffer) {
          Object.assign(offer, updatedOffer);
        }
      }
    }

    // Check if offer has a redemption limit and if it's been reached
    if (offer.maxRedemptionLimit && offer.maxRedemptionLimit > 0) {
      // Use currentPeriodCount for recurring offers, redeemCount for non-recurring
      const currentCount = (offer.recurringType && offer.recurringType !== "never") 
        ? (offer.currentPeriodCount || 0) 
        : (offer.redeemCount || 0);
      
      if (currentCount >= offer.maxRedemptionLimit) {
        const resetMessage = offer.recurringType === "weekly" 
          ? "This offer will reset weekly." 
          : offer.recurringType === "monthly" 
            ? "This offer will reset monthly."
            : "Please check back later or explore other offers.";
            
        return NextResponse.json(
          { 
            error: "Offer fully claimed", 
            message: `This offer has reached its redemption limit. ${resetMessage}` 
          },
          { status: 410 } // 410 Gone - resource no longer available
        );
      }
    }

    // Generate a unique redeem code
    const redeemCode = crypto
      .createHash("sha256")
      .update(offerId + Date.now().toString())
      .digest("hex")
      .substring(0, 8)
      .toUpperCase();

    const wallet = new Wallet({
      userId: decodedToken.userId,
      offerId,
      offerStatus,
      redeemCode,
      offerRestaurantId,
    });

    try {
      await wallet.save();
    } catch (saveError: any) {
      if (saveError.code === 11000 && saveError.keyPattern?.offerId) {
        return NextResponse.json(
          { error: "This offer has already been redeemed" },
          { status: 409 }
        );
      }
      throw saveError; // Re-throw other errors
    }

    // Increment the appropriate counter for the offer
    const updateFields: any = { $inc: { redeemCount: 1 } };
    
    // Also increment currentPeriodCount for recurring offers
    if (offer.recurringType && offer.recurringType !== "never") {
      updateFields.$inc.currentPeriodCount = 1;
    }
    
    await Offer.findByIdAndUpdate(
      offerId,
      updateFields,
      { new: true }
    );

    return NextResponse.json(
      {
        message: "Wallet entry created successfully",
        redeemCode: wallet.redeemCode,
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

export async function GET(req: Request) {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Authentication token required" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET as string) as {
        userId: string;
        role: string;
      };
    } catch (err) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    await connectToDatabase();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // Fetch wallet entries with populated offer and restaurant in **one query**
    const walletEntries = await Wallet.find({ userId: decodedToken.userId })
      .sort({ createdAt: -1 }).populate({
        path: "offerId",
        populate: {
          path: "restaurantId",
          select: "name address city zipCode addressLink dineIn dineOut category images phone email website deliveryAvailable"
        }
      })
      .populate({ path: "userId", select: "mobile" })
      .lean(); // convert to plain JS object for faster access

    const now = new Date();
    const redeemedOffersAll: any[] = [];
    const activeOffersAll: any[] = [];

    for (const walletEntry of walletEntries) {
      const offer = walletEntry.offerId;
      if (!offer) continue;

      const expiryDate = offer.expiryDate ? new Date(offer.expiryDate) : null;
      const isExpired = expiryDate && expiryDate <= now;

      if (expiryDate && isExpired) continue; // skip fully expired offers

      const redeemCodeExpiry = walletEntry.redeemCodeExpiry ? new Date(walletEntry.redeemCodeExpiry) : null;
      const isRedeemCodeExpired = redeemCodeExpiry && redeemCodeExpiry <= now;

      const restaurant = offer.restaurantId; // already populated
      const user = walletEntry.userId; // already populated

      const offerData = {
        ...offer,
        redeemed: true,
        redeemCode: walletEntry.redeemCode,
        redeemStatus: walletEntry.redeemStatus,
        redeemCodeExpiry: walletEntry.redeemCodeExpiry,
        walletId: walletEntry._id,
        isRedeemCodeExpired,
        bookingRequirement: offer.bookingRequirement || "mandatory",
        phone: restaurant?.phone || null,
        userPhone: user?.mobile || null,
        restaurant: restaurant
          ? {
            _id: restaurant._id,
            name: restaurant.name,
            address: restaurant.address,
            city: restaurant.city,
            zipCode: restaurant.zipCode?.toUpperCase(),
            addressLink: restaurant.addressLink,
            dineIn: restaurant.dineIn,
            dineOut: restaurant.dineOut,
            category: restaurant.category,
            images: restaurant.images,
            phone: restaurant.phone,
            email: restaurant.email,
            website: restaurant.website,
            deliveryAvailable: restaurant.deliveryAvailable,
          }
          : null,
      };

      if (walletEntry.redeemStatus === true && isRedeemCodeExpired) {
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
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 });
  }
}
