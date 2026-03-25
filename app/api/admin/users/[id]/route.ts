import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAdminToken } from "@/lib/auth-admin";
import Stripe from "stripe";
import User from "@/models/User";
import Restaurant from "@/models/Restaurant";
import Offer from "@/models/Offer";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: 401 }
      );
    }

    const { id } = await params;

    await connectToDatabase();

    // Get user details
    const user = await User.findById(id);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    let invoices: any[] = [];

    // Get invoices from Stripe (with error boundary)
    if (user.stripeCustomerId) {
      try {
        const stripeInvoices = await stripe.invoices.list({
          customer: user.stripeCustomerId,
          limit: 100,
        });
        invoices = stripeInvoices.data;
      } catch (stripeError: any) {
        console.warn(
          `Stripe error for customer ${user.stripeCustomerId}:`,
          stripeError.message
        );
        // Don’t throw, just send empty invoices
        invoices = [];
      }
    }

    // Format the response - exclude sensitive information
    const formattedUser = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus || "inactive",
      subscriptionId: user.subscriptionId,
      stripeCustomerId: user.stripeCustomerId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return NextResponse.json({
      success: true,
      user: formattedUser,
      invoices: invoices,
    });
  } catch (error: any) {
    console.error("Error fetching user details:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch user details",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// Initialize Stripe outside of the function to avoid repeated initialization
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Verify admin authentication
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: 401 }
      );
    }

    const { id } = params;
    await connectToDatabase();

    // ✅ Find user
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Check if already deleted
    if (user.deleted) {
      return NextResponse.json(
        { success: false, message: "User is already deleted" },
        { status: 400 }
      );
    }

    // 🆕 Handle Stripe subscription cancellation
    let stripeCleanupResult = { 
      subscriptionCanceled: false 
    };
    
    if (user.subscriptionId) {
      try {
        // Cancel active subscription if exists
        await stripe.subscriptions.cancel(user.subscriptionId);
        stripeCleanupResult.subscriptionCanceled = true;

        // Update user's subscription status in database
        await User.findByIdAndUpdate(user._id, {
          subscriptionStatus: 'cancelled',
          subscriptionId: null
        });
      } catch (stripeError: any) {
        console.error('Stripe subscription cancellation error:', stripeError);
        // Log the error but continue with user deletion
      }
    }

    // ✅ If user is a restaurant → soft delete restaurant + offers
    if (user.role === "restaurant") {
      const restaurant = await Restaurant.findOne({ userId: user._id });
      if (restaurant) {
        // Soft delete all offers of this restaurant
        await Offer.updateMany(
          { restaurantId: restaurant._id },
          { 
            status: 'inactive',
            deactivated: true 
          }
        );

        console.log("Soft deleting restaurants with associatedId:", restaurant.userId);

        // Soft delete linked restaurants (only if associatedId exists)
        if (restaurant.userId) {
          const associatedRestaurants = await Restaurant.find({ associatedId: restaurant.userId });

          // Deactivate their offers
          for (const assoc of associatedRestaurants) {
            await Offer.updateMany(
              { restaurantId: assoc._id },
              { 
                status: 'inactive',
                deactivated: true 
              }
            );
          }

          // Hide associated restaurants
          await Restaurant.updateMany(
            { associatedId: restaurant.userId },
            { hidden: true }
          );
        }

        // Hide the main restaurant
        await Restaurant.findByIdAndUpdate(restaurant._id, { hidden: true });
      }
    }

    // ✅ Soft delete user itself
    await User.findByIdAndUpdate(user._id, {
      deleted: true,
      deletedAt: new Date()
    });

    console.log("User soft deleted:", user.email);
    console.log("Stripe subscription cancellation result:", stripeCleanupResult);

    return NextResponse.json({
      success: true,
      message: "User and associated data soft deleted successfully",
      stripeCleanup: stripeCleanupResult
    });
  } catch (error: any) {
    console.error("Error deleting user and related data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete user",
        error: error.message,
      },
      { status: 500 }
    );
  }
}