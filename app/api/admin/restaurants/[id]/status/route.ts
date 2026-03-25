import { type NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
import User from "@/models/User";
import Offer from "@/models/Offer"; // Add this import
import { verifyAdminToken } from "@/lib/auth-admin";
import sendEmail from "@/lib/sendEmail";
import { render } from "@react-email/render";
import { RestaurantApprovalEmail } from "@/utils/email-templates/restuarant-approval";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { status } = await req.json();

    // Validate status
    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid status. Must be 'pending', 'approved', or 'rejected'",
        },
        { status: 400 }
      );
    }

    // Find restaurant first to get userId
    const restaurant = await Restaurant.findById(params.id);
    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Update restaurant status
    restaurant.status = status;
    await restaurant.save();

    console.log(`Restaurant ${restaurant._id} status updated to: ${status}`);
    console.log(`Restaurant owner userId: ${restaurant.userId}`);

    // If approving, handle user role update, offers status update, and email
    if (status === "approved" && restaurant.userId) {
      try {
        // Update all offers for this restaurant to active
        await Offer.updateMany(
          { restaurantId: restaurant._id },
          { $set: { status: 'active' } }
        );
        console.log(`Updated all offers for restaurant ${restaurant._id} to active status`);

        const user = await User.findById(restaurant.userId);
        if (user) {
          user.role = "restaurant";
          await user.save();
          console.log(`Updated user ${user._id} role to restaurant`);

          // Send Restaurant Approval Email
          try {
            console.log("Sending approval email..." , user.email, user.firstName, restaurant.name, restaurant.images[0]); 
            const emailHtml = await render(
              RestaurantApprovalEmail({
                ownerName: user.firstName,
                restaurantName: restaurant.name,
                restaurantImage:
                  restaurant.images[0] || "https://via.placeholder.com/600x400", 
              })
            );

            await sendEmail(
              user.email,
              "Your Restaurant Has Been Approved!",
              emailHtml
            );

            console.log(`Approval email sent to ${user.email}`);
          } catch (emailError: any) {
            console.error(
              `Error sending approval email for restaurant ${restaurant._id}:`,
              emailError
            );
          }
        } else {
          console.log(
            `Warning: Could not find user for restaurant ${restaurant._id}`
          );
        }
      } catch (userError) {
        console.error(
          `Error updating user role or offers for restaurant ${restaurant._id}:`,
          userError
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Restaurant status updated to ${status}`,
      restaurant,
    });
  } catch (error: any) {
    console.error("Error updating restaurant status:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update restaurant status",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
