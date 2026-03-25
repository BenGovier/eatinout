import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectToDatabase from "@/lib/mongodb";
import Offer from "@/models/Offer";
import Restaurant from "@/models/Restaurant"; // Add this import at the top
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
import dotenv from "dotenv";
import { Wallet } from "@/models/Wallet";
import { render } from "@react-email/render";
import NewOfferSubmissionEmail from "@/utils/email-templates/NewOfferSubmissionEmail";
import sendEmail from "@/lib/sendEmail";
import { generateSlug } from "@/lib/utils";

dotenv.config();

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

    await connectToDatabase();

    const now = new Date();

    // Pagination
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const total = await Offer.countDocuments({
      $or: [{ restaurantId }, { associatedId: userId }],
    });

    // Fetch and sort offers by createdAt descending (newest first)
    // Using MongoDB sort for better performance
    const allOffers = await Offer.find({
      $or: [{ restaurantId }, { associatedId: userId }],
    })
      .sort({ createdAt: -1 }) // Sort by creation date descending (newest first)
      .lean();

    // Sort offers: pinned first by pinnedAt DESC (most recently pinned first), then unpinned by createdAt descending
    const sortedOffers = allOffers.sort((a: any, b: any) => {
      // If both are pinned, sort by pinnedAt descending (most recent first)
      if (a.isPinned && b.isPinned) {
        const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        return bTime - aTime; // DESC order
      }
      // Pinned offers come first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Both unpinned: sort by createdAt descending (already sorted by MongoDB, but ensure consistency)
      const aCreated = new Date(a.createdAt).getTime();
      const bCreated = new Date(b.createdAt).getTime();
      return bCreated - aCreated; // DESC order - newest first
    });

    // Apply pagination after sorting
    const offers = sortedOffers.slice(skip, skip + limit);

    // Early return if no offers
    if (offers.length === 0) {
      return NextResponse.json({
        success: true,
        offers: [],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        subscription: {
          status: "inactive",
          hasActiveSubscription: false,
        },
      });
    }

    const offerIds = offers.map((offer: any) => offer._id);

    // Performance optimization: Batch fetch redemption counts for all offers at once
    const redemptionCounts = offerIds.length > 0 ? await Wallet.aggregate([
      {
        $match: {
          offerId: { $in: offerIds },
          offerStatus: "redeemed"
        }
      },
      {
        $group: {
          _id: "$offerId",
          count: { $sum: 1 }
        }
      }
    ]) : [];

    // Create a map for quick lookup of redemption counts
    const redemptionMap = new Map<string, number>();
    redemptionCounts.forEach((item: any) => {
      redemptionMap.set(item._id.toString(), item.count);
    });

    // Performance optimization: Batch fetch all restaurants at once
    const restaurantIds = [...new Set(offers.map((offer: any) => offer.restaurantId.toString()))];
    const restaurants = await Restaurant.find({
      _id: { $in: restaurantIds }
    }).lean();

    // Create a map for quick lookup of restaurants
    const restaurantMap = new Map<string, any>();
    restaurants.forEach((restaurant: any) => {
      restaurantMap.set(restaurant._id.toString(), restaurant);
    });

    // Get the first restaurant to check subscription status (reuse from map if available)
    let firstRestaurant = restaurantMap.get(restaurantId) ||
      await Restaurant.findOne({
        $or: [{ _id: restaurantId }, { associatedId: userId }],
      }).lean();

    const subscriptionStatus = firstRestaurant?.subscriptionStatus || "inactive";
    const hasActiveSubscription = subscriptionStatus === "active";

    // Map offers with redemption counts and restaurant data
    const offersWithRedemptions = offers.map((offer: any) => {
      const offerIdStr = offer._id.toString();
      const restaurant = restaurantMap.get(offer.restaurantId.toString());
      const restaurantIdStr = restaurant?._id.toString() || "";
      const redeemCount = redemptionMap.get(offerIdStr) || 0;

      // Calculate status based on dates and manual deactivation
      // Map pending to inactive - no pending status
      const statusForCalc = offer.status === "pending" ? "inactive" : offer.status;
      const calculatedStatus = calculateOfferStatus(
        offer.startDate,
        offer.expiryDate,
        offer.runUntilFurther || false,
        offer.deactivated || false,
        statusForCalc
      );

      // Update status in database if it has changed (but preserve rejected)
      // Always update if status was pending (to convert to inactive/active/expired)
      if ((calculatedStatus !== offer.status && offer.status !== "rejected") || offer.status === "pending") {
        // Update in background (don't await to avoid blocking response)
        Offer.findByIdAndUpdate(offer._id, { status: calculatedStatus }, { new: true }).catch((err) => {
          console.error(`Failed to update status for offer ${offerIdStr}:`, err);
        });
      }

      return {
        id: offerIdStr,
        title: offer.title,
        description: offer.description,
        validDays: offer.validDays,
        validHours: offer.validHours,
        startDate: offer.startDate,
        expiryDate: offer.expiryDate,
        status: calculatedStatus, // Use calculated status
        offerType: offer.offerType,
        discountPercentage: offer.discountPercentage ?? null,
        freeItemName: offer.freeItemName ?? null,
        otherOfferDescription: offer.otherOfferDescription ?? null,
        terms: offer.terms,
        dineIn: offer.dineIn,
        dineOut: offer.dineOut,
        createdAt: offer.createdAt,
        areas: offer.areas,
        restaurantId: offer.restaurantId,
        restaurantName: restaurant?.name || null,
        restaurantSlug: restaurant?.name ? generateSlug(restaurant.name, restaurantIdStr) : null,
        offerSlug: generateSlug(offer.title, offerIdStr),
        associatedId: offer.associatedId,
        maxRedemptionLimit: offer.maxRedemptionLimit ?? null,
        isUnlimited: offer.isUnlimited ?? false,
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

    await connectToDatabase();

    // Check restaurant status


    // Parse request body
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
    const restaurant = await Restaurant.findById(reqRestaurantId ? reqRestaurantId : restaurantId);
    if (!restaurant) {
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
    // If restaurant is pending, still use date-based logic - offer will be inactive until restaurant is approved
    const initialStatus = calculateOfferStatus(
      startDate,
      expiryDate,
      runUntilFurther || false,
      false, // Not deactivated initially
      undefined // No current status
    );

    // Create new offer with status based on restaurant status and dates
    const offer = new Offer({
      restaurantId: reqRestaurantId ? reqRestaurantId : restaurantId,
      title,
      description,
      offerType,
      discountPercentage: discountPercentage ?? null,
      freeItemName: freeItemName ?? null,
      otherOfferDescription: otherOfferDescription ?? null,
      validDays,
      validHours,
      startDate,
      expiryDate,
      terms: terms || "",
      dineIn,
      dineOut,
      status: initialStatus,
      associatedId: userId,
      runUntilFurther,
      maxRedemptionLimit,
      isUnlimited,
      bookingRequirement,
      recurringType: recurringType || null,
      recurringStartDate: recurringStartDate || null,
      tags: Array.isArray(tags) ? tags : [],
      currentPeriodCount: 0,
      lastResetDate: null,
      deactivated: false,
    });

    await offer.save();

    // Send new offer submission email notification
    try {
      const emailHtml = await render(
        NewOfferSubmissionEmail({
          venueName: restaurant.name || restaurant.restaurantName || "Unknown Restaurant",
          offerTitle: offer.title,
          offerDescription: offer.description,
          offerType: offer.offerType,
          validDays: offer.validDays,
          validHours: offer.validHours,
          startDate: offer.startDate,
          expiryDate: offer.expiryDate,
          termsAndConditions: offer.terms || "No terms and conditions specified",
          dineIn: offer.dineIn || false,
          dineOut: offer.dineOut || false,
          runUntilFurther: offer.runUntilFurther || false,
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
      // Don't fail the API if email sending fails - just log the error
    }

    return NextResponse.json(
      {
        success: true,
        message: "Offer created successfully",
        offer: {
          id: offer._id.toString(),
          title: offer.title,
          validDays: offer.validDays,
          startDate: offer.startDate,
          expiryDate: offer.expiryDate,
          offerType: offer.offerType,
          status: offer.status,
          associatedId: userId,
          runUntilFurther,
          maxRedemptionLimit,
          isUnlimited,
          bookingRequirement,
          recurringType: offer.recurringType,
          recurringStartDate: offer.recurringStartDate,
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

    await connectToDatabase();

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
    const currentOffer = await Offer.findById(id);
    if (!currentOffer) {
      return NextResponse.json(
        { message: "Offer not found or unauthorized" },
        { status: 404 }
      );
    }

    // Calculate status based on dates and manual deactivation
    // If status is explicitly set to inactive, preserve it by setting deactivated flag
    const isManuallyInactive = status === "inactive" && currentOffer.status === "inactive";
    const finalDeactivated = isManuallyInactive || currentOffer.deactivated || false;

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

    // Update offer
    const updatedOffer = await Offer.findOneAndUpdate(
      { _id: id }, // Use the restaurant ID 
      {
        title,
        description,
        offerType,
        discountPercentage: discountPercentage ?? null,
        freeItemName: freeItemName ?? null,
        otherOfferDescription: otherOfferDescription ?? null,
        validDays,
        validHours,
        startDate,
        expiryDate,
        terms: terms || "",
        dineIn,
        dineOut,
        status: calculatedStatus, // Use calculated status
        associatedId,
        restaurantId,
        runUntilFurther,
        maxRedemptionLimit,
        isUnlimited,
        bookingRequirement,
        recurringType: recurringType || null,
        recurringStartDate: recurringStartDate || null,
        tags: Array.isArray(tags) ? tags : [],
        deactivated: finalDeactivated, // Preserve manual deactivation
      },
      { new: true }
    );

    if (!updatedOffer) {
      return NextResponse.json(
        { message: "Offer not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Offer updated successfully",
      offer: {
        id: updatedOffer._id.toString(),
        validDays: updatedOffer.validDays,
        expiryDate: updatedOffer.expiryDate,
        status: updatedOffer.status,
        runUntilFurther: updatedOffer.runUntilFurther,
        bookingRequirement: updatedOffer.bookingRequirement,
        maxRedemptionLimit: updatedOffer.maxRedemptionLimit,
        isUnlimited: updatedOffer.isUnlimited,
        recurringType: updatedOffer.recurringType,
        recurringStartDate: updatedOffer.recurringStartDate,
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