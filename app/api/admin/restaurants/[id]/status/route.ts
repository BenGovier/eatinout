// app/api/admin/restaurants/[id]/status/route.ts
import { type NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/auth-admin";
import sendEmail from "@/lib/sendEmail";
import { render } from "@react-email/render";
import { RestaurantApprovalEmail } from "@/utils/email-templates/restuarant-approval";

const RESTAURANT_DOC_SELECT = `
  id, name, slug, description, address, city, zip_code, phone, email, website, user_id, status,
  dine_in, dine_out, delivery_available, associated_id, address_link, is_hidden,
  subscription_status, stripe_customer_id, lat, lng,
  home_is_pinned, home_pin_priority, home_pinned_at, created_at, updated_at,
  restaurant_areas(area_id),
  restaurant_categories(category_id),
  restaurant_tags(tag_id),
  restaurant_images(image_url, display_order),
  restaurant_menu_pdfs(pdf_url, display_order),
  restaurant_area_pins(area_id, is_pinned, priority, pinned_at)
`

const mapRestaurantDoc = (r: any) => ({
  _id: r.id as string,
  name: r.name,
  slug: r.slug,
  description: r.description,
  address: r.address,
  city: r.city,
  zipCode: r.zip_code,
  area: (r.restaurant_areas || []).map((ra: any) => ra.area_id) as string[],
  phone: r.phone,
  email: r.email,
  website: r.website,
  userId: r.user_id as string | null,
  images: (r.restaurant_images || [])
    .slice()
    .sort((a: any, b: any) => a.display_order - b.display_order)
    .map((i: any) => i.image_url) as string[],
  status: r.status as string,
  dineIn: r.dine_in,
  dineOut: r.dine_out,
  deliveryAvailable: r.delivery_available,
  category: (r.restaurant_categories || []).map((rc: any) => rc.category_id) as string[],
  associatedId: r.associated_id as string | null,
  addressLink: r.address_link,
  menuPdfUrls: (r.restaurant_menu_pdfs || [])
    .slice()
    .sort((a: any, b: any) => a.display_order - b.display_order)
    .map((p: any) => p.pdf_url) as string[],
  hidden: r.is_hidden,
  subscriptionStatus: r.subscription_status,
  stripeCustomerId: r.stripe_customer_id,
  homePin: {
    isPinned: r.home_is_pinned,
    priority: r.home_pin_priority,
    pinnedAt: r.home_pinned_at,
  },
  areaPins: (r.restaurant_area_pins || []).map((p: any) => ({
    areaId: p.area_id,
    isPinned: p.is_pinned,
    priority: p.priority,
    areaPinnedAt: p.pinned_at,
  })),
  searchTags: (r.restaurant_tags || []).map((t: any) => t.tag_id) as string[],
  lat: r.lat,
  lng: r.lng,
  ...(r.lat != null && r.lng != null
    ? { location: { type: "Point", coordinates: [r.lng, r.lat] } }
    : {}),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const getRestaurantDocById = async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from("restaurants")
    .select(RESTAURANT_DOC_SELECT)
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapRestaurantDoc(data) : null
}

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
    const restaurant = await getRestaurantDocById(params.id);
    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Update restaurant status
    restaurant.status = status;
    const { error: statusSaveError } = await supabaseAdmin
      .from("restaurants")
      .update({ status })
      .eq("id", restaurant._id);
    if (statusSaveError) throw new Error(statusSaveError.message);

    console.log(`Restaurant ${restaurant._id} status updated to: ${status}`);
    console.log(`Restaurant owner userId: ${restaurant.userId}`);

    // If approving, handle user role update, offers status update, and email
    if (status === "approved" && restaurant.userId) {
      try {
        // Update all offers for this restaurant to active
        const { error: offersUpdateError } = await supabaseAdmin
          .from("offers")
          .update({ status: 'active' })
          .eq("restaurant_id", restaurant._id);
        if (offersUpdateError) throw new Error(offersUpdateError.message);
        console.log(`Updated all offers for restaurant ${restaurant._id} to active status`);

        const { data: userRow, error: userError } = await supabaseAdmin
          .from("users")
          .select("id, email, first_name, role")
          .eq("id", restaurant.userId)
          .maybeSingle();
        if (userError) throw new Error(userError.message);
        const user = userRow && {
          _id: userRow.id,
          email: userRow.email,
          firstName: userRow.first_name,
          role: userRow.role,
        };
        if (user) {
          user.role = "restaurant";
          const { error: roleSaveError } = await supabaseAdmin
            .from("users")
            .update({ role: "restaurant" })
            .eq("id", user._id);
          if (roleSaveError) throw new Error(roleSaveError.message);
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