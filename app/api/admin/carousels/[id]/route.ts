import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Carousel from "@/models/Carousel";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const { id } = params;
    const body = await req.json();

    const carousel = await Carousel.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate({
      path: "restaurants.restaurantId",
      model: "Restaurant",
      select: "name images",
    });

    if (!carousel) {
      return NextResponse.json(
        { success: false, message: "Carousel not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Carousel updated successfully",
      carousel,
    });
  } catch (error: any) {
    console.error("Error updating carousel:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update carousel",
        error: error.message,
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
    await connectToDatabase();

    const { id } = params;

    const carousel = await Carousel.findByIdAndDelete(id);

    if (!carousel) {
      return NextResponse.json(
        { success: false, message: "Carousel not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Carousel deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting carousel:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete carousel",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const { id } = params;

    const carousel = await Carousel.findById(id)
      .populate({
        path: "restaurants.restaurantId",
        model: "Restaurant",
        select: "name images",
      });

    if (!carousel) {
      return NextResponse.json(
        { success: false, message: "Carousel not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      carousel,
    });
  } catch (error: any) {
    console.error("Error fetching carousel:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch carousel",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
