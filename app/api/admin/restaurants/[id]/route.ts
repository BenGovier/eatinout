import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import Restaurant from "@/models/Restaurant"
import Offer from "@/models/Offer"
import { Category } from "@/models/Categories" // Add this import
import { verifyAdminToken } from "@/lib/auth-admin"
import User from "@/models/User"; // ✅ Make sure this path is correct
import Tag from "@/models/Tag";

export async function GET(
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

    const { id } = await params;

    await connectToDatabase();

    // Get restaurant details
    // const restaurant = await Restaurant.findById(id);
    const restaurant = await Restaurant
      .findById(id)
      .select("+homePriority"); // 🔥 THIS IS THE FIX

    if (!restaurant) {
      return NextResponse.json(
        {
          success: false,
          message: "Restaurant not found",
        },
        { status: 404 }
      );
    }

    // Get restaurant offers
    const offers = await Offer.find({ restaurantId: id });

    // Sort offers: pinned first by pinnedAt DESC (most recently pinned first), then unpinned by createdAt descending
    const sortedOffers = offers.sort((a: any, b: any) => {
      // If both are pinned, sort by pinnedAt descending (most recent first)
      if (a.isPinned && b.isPinned) {
        const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        return bTime - aTime; // DESC order
      }
      // Pinned offers come first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Both unpinned: sort by createdAt descending
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Adjust offer status in-memory based on dates and deactivation
    const now = new Date();
    const offersWithAdjustedStatus = sortedOffers.map((offer: any) => {
      let adjustedStatus = offer.status;
      if (!offer.deactivated) {
        const startDate = offer.startDate ? new Date(offer.startDate) : null;
        const expiryDate = offer.expiryDate ? new Date(offer.expiryDate) : null;

        if (startDate && startDate > now) adjustedStatus = "inactive";
        else if (expiryDate && expiryDate < now) adjustedStatus = "expired";
        else if (startDate && startDate <= now && (!expiryDate || expiryDate > now)) adjustedStatus = "active";
        else if (!expiryDate) adjustedStatus = "active";
      }

      return { ...offer.toObject(), status: adjustedStatus };
    });

    // Fetch category details (support array or single value)
    let categories = [];
    if (Array.isArray(restaurant.category)) {
      categories = await Promise.all(
        restaurant.category.map(async (catId: any) => {
          const category = await Category.findById(catId).select('name');
          return {
            id: catId,
            name: category ? category.name : null
          };
        })
      );
    } else if (restaurant.category) {
      const category = await Category.findById(restaurant.category).select('name');
      categories = [{
        id: restaurant.category,
        name: category ? category.name : null
      }];
    }


    // 🔥 Resolve searchTags (ID -> { _id, name })
    let resolvedSearchTags: Array<{ _id: string; name: string | null }> = [];

    if (Array.isArray(restaurant.searchTags) && restaurant.searchTags.length > 0) {
      resolvedSearchTags = await Promise.all(
        restaurant.searchTags.map(async (tagId: string) => {
          const tag = await Tag.findById(tagId).select("name");
          return {
            _id: tagId,
            name: tag ? tag.name : null,
          };
        })
      );
    }

    // Convert restaurant to plain object and add categories array
    const restaurantWithCategory = {
      ...restaurant.toObject(),
      category: categories,
      searchTags: resolvedSearchTags,
      homePriority: restaurant.homePriority ?? 0, // ✅ ADD THIS LINE
    };

    return NextResponse.json({
      success: true,
      restaurant: restaurantWithCategory,
      offers: offersWithAdjustedStatus,
    })
  } catch (error: unknown) {
    console.error("Error fetching restaurant details:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch restaurant details",
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const adminCheck = await verifyAdminToken(req)
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 })
    }

    const { id } = params

    // Get request data
    const data = await req.json()

    // Connect to database
    await connectToDatabase()
    console.log("idd", id)
    // Check if restaurant exists
    const existingRestaurant = await Restaurant.findById(id)
    if (!existingRestaurant) {
      return NextResponse.json(
        { success: false, message: "Restaurant not found" },
        { status: 404 }
      )
    }

    // Create update object with only the fields that are provided in the request
    const updateData: Record<string, any> = {}

    // Check each field and only include it if it's provided in the request
    if (data.email !== undefined) updateData.email = data.email
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.website !== undefined) updateData.website = data.website
    if (data.area !== undefined) updateData.area = data.area
    if (data.address !== undefined) updateData.address = data.address
    if (data.city !== undefined) updateData.city = data.city
    if (data.state !== undefined) updateData.state = data.state
    if (data.zipCode !== undefined) updateData.zipCode = data.zipCode
    if (data.status !== undefined) updateData.status = data.status
    if (data.category !== undefined) updateData.category = data.category
    if (data.description !== undefined) updateData.description = data.description
    if (data.name !== undefined) updateData.name = data.name
    if (data.dineOut !== undefined) updateData.dineOut = data.dineOut
    if (data.deliveryAvailable !== undefined) updateData.deliveryAvailable = data.deliveryAvailable
    if (data.menuPdfUrls !== undefined) updateData.menuPdfUrls = data.menuPdfUrls;
    if (data.dineIn !== undefined) updateData.dineIn = data.dineIn
    if (data.images !== undefined) updateData.images = data.images
    if (data.searchTags !== undefined) updateData.searchTags = data.searchTags
    if (data.lat !== undefined) updateData.lat = data.lat
    if (data.lng !== undefined) updateData.lng = data.lng

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date()

    // Update restaurant in database with only the fields that were provided
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    if (data.searchTags !== undefined && Array.isArray(data.searchTags)) {
      // Remove restaurant from all tags first
      await Tag.updateMany(
        { restaurants: id },
        { $pull: { restaurants: id } }
      );

      // Add restaurant to selected tags
      if (data.searchTags.length > 0) {
        await Tag.updateMany(
          { _id: { $in: data.searchTags } },
          { $addToSet: { restaurants: id } }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Restaurant updated successfully",
      restaurant: updatedRestaurant
    })

  } catch (error: unknown) {
    console.error("Error updating restaurant:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update restaurant",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}


export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Verify admin token
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // ✅ Check if restaurant exists
    const existingRestaurant = await Restaurant.findById(id);
    if (!existingRestaurant) {
      return NextResponse.json(
        { success: false, message: "Restaurant not found" },
        { status: 404 }
      );
    }

    await Offer.deleteMany({ restaurantId: id });

    await Restaurant.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Restaurant, offers, and associated user deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting restaurant:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete restaurant",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
