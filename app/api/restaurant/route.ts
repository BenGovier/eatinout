import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectToDatabase from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
import User from "@/models/User";
import { Category } from "@/models/Categories";
import Area from "@/models/Area";
import Stripe from "stripe";
import Tag from "@/models/Tag";
import { generateUniqueRestaurantSlug } from "@/lib/restaurant-slug";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as {
        restaurantId?: string;
        userId?: string;
        role: string;
      };

      if (decodedToken.role !== "restaurant") {
        return NextResponse.json({ message: "Unauthorized - Not a restaurant" }, { status: 403 });
      }
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    await connectToDatabase();

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const page = parseInt(url.searchParams.get("page") || "1", 10); // default 1
    const limit = parseInt(url.searchParams.get("limit") || "10", 10); // default 10
    const skip = (page - 1) * limit;

    const getCategories = async (categoryIds: any[]) => {
      if (!categoryIds || categoryIds.length === 0) return [];
      const categories = await Category.find({ _id: { $in: categoryIds } }).select("name");
      return categoryIds.map((id) => {
        const cat = categories.find((c) => c._id.toString() === id.toString());
        return { id, name: cat ? cat.name : null };
      });
    };

    const getAreas = async (areaIds: any[]) => {
      if (!areaIds || areaIds.length === 0) return [];
      const areas = await Area.find({ _id: { $in: areaIds } }).select("name hideRestaurant");
      return areaIds.map((id) => {
        const area = areas.find((a) => a._id.toString() === id.toString());
        return {
          id,
          name: area ? area.name : null,
          hideRestaurant: area ? area.hideRestaurant || false : false,
        };
      });
    };

    if (id) {
      const restaurant = await Restaurant.findOne({
        _id: id,
        $or: [{ associatedId: decodedToken.userId }, { userId: decodedToken.userId }]
      });

      if (!restaurant) {
        return NextResponse.json({ message: "Restaurant not found or you don't have access" }, { status: 404 });
      }

      const categories = await getCategories(Array.isArray(restaurant.category) ? restaurant.category : [restaurant.category]);
      const areas = await getAreas(restaurant.area);

      return NextResponse.json({
        ...restaurant.toObject(),
        category: categories,
        area: areas,
      });
    } else {
      const totalCount = await Restaurant.countDocuments({
        $or: [{ associatedId: decodedToken.userId }, { userId: decodedToken.userId }]
      });

      const restaurants = await Restaurant.find({
        $or: [{ associatedId: decodedToken.userId }, { userId: decodedToken.userId }]
      })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      if (!restaurants || restaurants.length === 0) {
        return NextResponse.json({ message: "No restaurants found for this account" }, { status: 404 });
      }

      const restaurantDataWithCategoryAndArea = await Promise.all(
        restaurants.map(async (restaurant) => {
          const categories = await getCategories(Array.isArray(restaurant.category) ? restaurant.category : [restaurant.category]);
          const areas = await getAreas(restaurant.area);
          return {
            ...restaurant.toObject(),
            category: categories,
            area: areas,
          };
        })
      );

      return NextResponse.json({
        data: restaurantDataWithCategoryAndArea,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    }
  } catch (error: any) {
    console.error("Error fetching restaurant data:", error);
    return NextResponse.json(
      { message: "Failed to fetch restaurant data", error: error.message },
      { status: 500 }
    );
  }
}
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as {
        restaurantId?: string;
        userId?: string;
        role: string;
      };

      if (decodedToken.role !== "restaurant") {
        return NextResponse.json({ message: "Unauthorized - Not a restaurant" }, { status: 403 });
      }
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    await connectToDatabase();
    const data = await request.json();

    if (!data.name || !data.email) {
      return NextResponse.json(
        { message: "Missing required fields: name or email" },
        { status: 400 }
      );
    }

    // Check if the email already exists
    const existingUser = await User.findOne({ email: data.email, _id: { $ne: decodedToken.userId } });
    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 } // Conflict status code
      );
    }

    const userRestaurant = await Restaurant.findOne({ userId: decodedToken.userId });

    // Check if user's restaurant is pending
    if (userRestaurant?.status === "pending") {
      return NextResponse.json(
        {
          message: "Your restaurant is still being reviewed. Once it's approved, you'll be able to add more restaurants."
        },
        { status: 400 }
      );
    }

    // Add the associatedId field with the restaurantId from the token
    data.associatedId = decodedToken.userId;
    // Set status for new restaurant
    data.status = "approved";
    data.dineIn = data.dineIn !== undefined ? data.dineIn : true;
    data.dineOut = data.dineOut !== undefined ? data.dineOut : false;
    data.deliveryAvailable = data.deliveryAvailable !== undefined ? data.deliveryAvailable : false;

    data.slug = await generateUniqueRestaurantSlug(data.name ?? "");

    const newRestaurant = new Restaurant(data);
    await newRestaurant.save();

    // 🔗 Sync Tags → Restaurant
    if (data.searchTags?.length > 0) {
      await Tag.updateMany(
        { _id: { $in: data.searchTags } },
        { $addToSet: { restaurants: newRestaurant._id } }
      );
    }
    return NextResponse.json(
      { message: "Restaurant created successfully", restaurant: newRestaurant },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating restaurant:", error);
    return NextResponse.json(
      { message: "Failed to create restaurant", error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as {
        restaurantId: string;
        role: string;
        userId: string;
      };

      if (decodedToken.role !== "restaurant") {
        return NextResponse.json({ message: "Unauthorized - Not a restaurant" }, { status: 403 });
      }

      if (!decodedToken.restaurantId) {
        return NextResponse.json(
          { message: "Restaurant ID not found in token" },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    await connectToDatabase();

    const data = await request.json();

    const existingUser = await User.findOne({
      email: data.email,
      _id: { $ne: decodedToken.userId }, // Exclude the current user by ID
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 } // Conflict status code
      );
    }
    data.associatedId = decodedToken.userId;

    // const updatedRestaurant = await Restaurant.findByIdAndUpdate(
    //   data.restaurantId,
    //   { $set: data },
    //   { new: true, runValidators: true }
    // );

    const {
      restaurantId,
      menuPdfUrls, // array
      searchTags = [],
      slug: _clientSlug,
      ...rest
    } = data;

    const setPayload: Record<string, unknown> = {
      ...rest,
      menuPdfUrls: Array.isArray(menuPdfUrls) ? menuPdfUrls : [],
      searchTags,
    };

    if (typeof rest.name === "string" && rest.name.trim()) {
      setPayload.slug = await generateUniqueRestaurantSlug(
        rest.name,
        restaurantId,
      );
    }

    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { $set: setPayload },
      { new: true, runValidators: true }
    );

    // 🔄 Sync Tags collection
    if (Array.isArray(searchTags)) {
      // Remove restaurant from all tags first
      await Tag.updateMany(
        { restaurants: restaurantId },
        { $pull: { restaurants: restaurantId } }
      );

      // Add restaurant to selected tags
      if (searchTags.length > 0) {
        await Tag.updateMany(
          { _id: { $in: searchTags } },
          { $addToSet: { restaurants: restaurantId } }
        );
      }
    }

    if (!updatedRestaurant) {
      return NextResponse.json(
        { message: "Restaurant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Restaurant updated successfully",
      restaurant: updatedRestaurant
    });
  } catch (error: any) {
    console.error("Error updating restaurant:", error);
    return NextResponse.json(
      { message: "Failed to update restaurant", error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Create subscription checkout session for restaurant
export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as {
        restaurantId?: string;
        userId?: string;
        role: string;
      };

      if (decodedToken.role !== "restaurant") {
        return NextResponse.json({ message: "Unauthorized - Not a restaurant" }, { status: 403 });
      }
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    await connectToDatabase();
    const data = await request.json();
    const { action, restaurantId } = data;

    if (action === "create-subscription-checkout") {
      // Get restaurant for customer info
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        return NextResponse.json({ message: "Restaurant not found" }, { status: 404 });
      }

      // Use the 6-month price ID from environment
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_RESTURENT_1MONTH;
      if (!priceId) {
        return NextResponse.json({ message: "Price ID not configured" }, { status: 500 });
      }

      // Create or get Stripe customer
      let customerId = restaurant.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: restaurant.email,
          name: restaurant.name,
          metadata: {
            restaurantId: restaurantId,
          },
        });
        customerId = customer.id;
        restaurant.stripeCustomerId = customerId;
        await restaurant.save();

        // Also update User model if userId exists
        if (decodedToken.userId) {
          await User.findByIdAndUpdate(
            decodedToken.userId,
            { $set: { stripeCustomerId: customerId } },
            { new: true }
          );
        }
      } else {
        // If customer already exists, ensure User model also has it
        if (decodedToken.userId) {
          const user = await User.findById(decodedToken.userId);
          if (user && !user.stripeCustomerId) {
            await User.findByIdAndUpdate(
              decodedToken.userId,
              { $set: { stripeCustomerId: customerId } },
              { new: true }
            );
          }
        }
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        billing_address_collection: "required",
        success_url: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/dashboard/offers?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/dashboard/offers?subscription=cancelled`,
        metadata: {
          restaurantId,
          type: "restaurant_subscription",
        },
      });

      return NextResponse.json({ url: session.url });
    }

    if (action === "verify-subscription") {
      const { sessionId, restaurantId: reqRestaurantId } = data;

      if (!sessionId) {
        return NextResponse.json({ message: "Session ID required" }, { status: 400 });
      }

      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // Use restaurantId from metadata or request body
        const restaurantIdToUpdate = session.metadata?.restaurantId || reqRestaurantId;

        if (!restaurantIdToUpdate) {
          console.error("No restaurant ID found in session metadata or request");
          return NextResponse.json({ message: "Restaurant ID not found" }, { status: 400 });
        }

        if (session.payment_status === "paid") {
          const updateData: any = {
            subscriptionStatus: "active",
            stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_RESTURENT_1MONTH,
            hasSubscribedBefore: true,
          };

          // Only update subscriptionId if it exists
          if (session.subscription) {
            updateData.subscriptionId = session.subscription as string;
          }

          // Only update customerId if it exists
          if (session.customer) {
            updateData.stripeCustomerId = session.customer as string;
          }

          // Update Restaurant model
          const restaurant = await Restaurant.findByIdAndUpdate(
            restaurantIdToUpdate,
            { $set: updateData },
            { new: true }
          );

          if (!restaurant) {
            console.error("Restaurant not found:", restaurantIdToUpdate);
            return NextResponse.json({ message: "Restaurant not found" }, { status: 404 });
          }

          // Update User model if userId exists
          if (decodedToken.userId) {
            const userUpdateData: any = {
              subscriptionStatus: "active",
              stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_RESTURENT_1MONTH,
              hasSubscribedBefore: true,
            };

            if (session.subscription) {
              userUpdateData.subscriptionId = session.subscription as string;
            }

            if (session.customer) {
              userUpdateData.stripeCustomerId = session.customer as string;
            }

            const user = await User.findByIdAndUpdate(
              decodedToken.userId,
              { $set: userUpdateData },
              { new: true }
            );

            if (user) {
              console.log("User subscription updated:", {
                userId: decodedToken.userId,
                subscriptionStatus: user.subscriptionStatus,
                subscriptionId: user.subscriptionId,
              });
            } else {
              console.warn("User not found for userId:", decodedToken.userId);
            }
          }

          console.log("Subscription verified and updated:", {
            restaurantId: restaurantIdToUpdate,
            userId: decodedToken.userId,
            subscriptionStatus: restaurant.subscriptionStatus,
            subscriptionId: restaurant.subscriptionId,
          });

          return NextResponse.json({
            success: true,
            message: "Subscription activated successfully",
            restaurant: {
              _id: restaurant._id,
              subscriptionStatus: restaurant.subscriptionStatus,
              subscriptionId: restaurant.subscriptionId,
              stripeCustomerId: restaurant.stripeCustomerId,
              stripePriceId: restaurant.stripePriceId,
            },
          });
        }

        return NextResponse.json({
          message: "Payment not completed",
          payment_status: session.payment_status
        }, { status: 400 });
      } catch (error: any) {
        console.error("Error verifying subscription:", error);
        return NextResponse.json(
          { message: "Failed to verify subscription", error: error.message },
          { status: 500 }
        );
      }
    }

    if (action === "check-subscription") {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        return NextResponse.json({ message: "Restaurant not found" }, { status: 404 });
      }

      return NextResponse.json({
        subscriptionStatus: restaurant.subscriptionStatus || "inactive",
        hasActiveSubscription: restaurant.subscriptionStatus === "active",
      });
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in subscription checkout:", error);
    return NextResponse.json(
      { message: "Failed to process request", error: error.message },
      { status: 500 }
    );
  }
}

