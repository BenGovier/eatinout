import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Carousel from "@/models/Carousel";
import Restaurant from "@/models/Restaurant";
import Area from "@/models/Area";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const areaFilter = searchParams.get("area") || "all";
    const statusFilter = searchParams.get("status") || "all";

    // Build query
    let query: any = {};

    // Search filter
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Status filter
    if (statusFilter !== "all") {
      query.isActive = statusFilter === "active";
    }

    // Area filter
    if (areaFilter !== "all") {
      if (areaFilter === "global") {
        query.isGlobal = true;
      } else {
        query.$or = [
          { isGlobal: true },
          { areaIds: areaFilter }
        ];
      }
    }

    const carousels = await Carousel.find(query)
      .populate({
        path: "restaurants.restaurantId",
        model: "Restaurant",
        select: "name images",
      })
      .sort({ createdAt: -1 });

    // Get stats
    const totalCount = await Carousel.countDocuments();
    const globalCount = await Carousel.countDocuments({ isGlobal: true });
    const areaCount = await Carousel.countDocuments({ isGlobal: false });
    const activeCount = await Carousel.countDocuments({ isActive: true });

    return NextResponse.json({
      success: true,
      carousels,
      stats: {
        total: totalCount,
        global: globalCount,
        area: areaCount,
        active: activeCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching carousels:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch carousels",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const {
      name,
      isGlobal,
      areaIds,
      areaOrders,
      restaurants,
      isActive,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Name is required" },
        { status: 400 }
      );
    }

    // Calculate global order for new carousel
    let globalOrder = 1;
    if (isGlobal) {
      const lastGlobalCarousel = await Carousel.findOne({ isGlobal: true })
        .sort({ globalOrder: -1 });
      globalOrder = lastGlobalCarousel ? lastGlobalCarousel.globalOrder + 1 : 1;
    }

    // Create carousel
    const carousel = new Carousel({
      name,
      isGlobal: isGlobal ?? true,
      areaIds: areaIds || [],
      areaOrders: areaOrders || [],
      globalOrder,
      restaurants: restaurants || [],
      isActive: isActive ?? true,
    });

    await carousel.save();

    // Populate the created carousel
    const populatedCarousel = await Carousel.findById(carousel._id)
      .populate({
        path: "restaurants.restaurantId",
        model: "Restaurant",
        select: "name images",
      });

    return NextResponse.json({
      success: true,
      message: "Carousel created successfully",
      carousel: populatedCarousel,
    });
  } catch (error: any) {
    console.error("Error creating carousel:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create carousel",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
