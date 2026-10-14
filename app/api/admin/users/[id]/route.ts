// api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/auth-admin";
import Stripe from "stripe";

// Supabase helpers: map snake_case rows to the camelCase shape used below, and throw on DB errors
const USER_COLUMNS =
  "id, first_name, last_name, email, role, subscription_status, is_trialing, subscription_id, stripe_customer_id, is_deleted, created_at, updated_at";

const mapUser = (row: any) =>
  row
    ? {
        _id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        role: row.role,
        subscriptionStatus: row.subscription_status,
        isTrialing: row.is_trialing,
        subscriptionId: row.subscription_id,
        stripeCustomerId: row.stripe_customer_id,
        deleted: row.is_deleted,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;

const dbCheck = (res: { error: any }) => {
  if (res.error) throw new Error(res.error.message);
};

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

    // Get user details
    const userRes = await supabaseAdmin
      .from("users")
      .select(USER_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    dbCheck(userRes);
    const user = mapUser(userRes.data);

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
      isTrialing: user.isTrialing,
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

    // ✅ Find user
    const userRes = await supabaseAdmin
      .from("users")
      .select(USER_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    dbCheck(userRes);
    const user = mapUser(userRes.data);
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
        dbCheck(
          await supabaseAdmin
            .from("users")
            .update({
              subscription_status: 'cancelled',
              subscription_id: null
            })
            .eq("id", user._id)
        );
      } catch (stripeError: any) {
        console.error('Stripe subscription cancellation error:', stripeError);
        // Log the error but continue with user deletion
      }
    }

    // ✅ If user is a restaurant → soft delete restaurant + offers
    if (user.role === "restaurant") {
      const restaurantRes = await supabaseAdmin
        .from("restaurants")
        .select("id, user_id")
        .eq("user_id", user._id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      dbCheck(restaurantRes);
      const restaurant = restaurantRes.data
        ? { _id: restaurantRes.data.id, userId: restaurantRes.data.user_id }
        : null;
      if (restaurant) {
        // Soft delete all offers of this restaurant
        dbCheck(
          await supabaseAdmin
            .from("offers")
            .update({ 
              status: 'inactive',
              is_deactivated: true 
            })
            .eq("restaurant_id", restaurant._id)
        );

        console.log("Soft deleting restaurants with associatedId:", restaurant.userId);

        // Soft delete linked restaurants (only if associatedId exists)
        if (restaurant.userId) {
          const assocRes = await supabaseAdmin
            .from("restaurants")
            .select("id")
            .eq("associated_id", restaurant.userId);
          dbCheck(assocRes);
          const associatedRestaurants = (assocRes.data || []).map((r: any) => ({ _id: r.id }));

          // Deactivate their offers
          for (const assoc of associatedRestaurants) {
            dbCheck(
              await supabaseAdmin
                .from("offers")
                .update({ 
                  status: 'inactive',
                  is_deactivated: true 
                })
                .eq("restaurant_id", assoc._id)
            );
          }

          // Hide associated restaurants
          dbCheck(
            await supabaseAdmin
              .from("restaurants")
              .update({ is_hidden: true })
              .eq("associated_id", restaurant.userId)
          );
        }

        // Hide the main restaurant
        dbCheck(
          await supabaseAdmin
            .from("restaurants")
            .update({ is_hidden: true })
            .eq("id", restaurant._id)
        );
      }
    }

    // ✅ Soft delete user itself
    dbCheck(
      await supabaseAdmin
        .from("users")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq("id", user._id)
    );

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