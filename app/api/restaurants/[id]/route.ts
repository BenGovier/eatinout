import { NextResponse } from "next/server";
import { getPublicRestaurantDetailByRouteParam } from "@/lib/get-public-restaurant-detail";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await getPublicRestaurantDetailByRouteParam(id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          error: result.error,
        },
        { status: result.status },
      );
    }

    return NextResponse.json({
      success: true,
      restaurant: result.restaurant,
    });
  } catch (error: unknown) {
    console.error("Error fetching restaurant:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch restaurant",
        error: message,
      },
      { status: 500 },
    );
  }
}
