import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
import { verifyAdminToken } from "@/lib/auth-admin";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { pinType, priority, areaUpdates } = await req.json();
    const { id } = params;

    if (!["home", "area", "unpinHome", "unpinAll"].includes(pinType)) {
      return NextResponse.json(
        { success: false, message: "Invalid pin type" },
        { status: 400 }
      );
    }

    /** ================= HOME PIN ================= */
    if (pinType === "home") {
      const homePriority =
        typeof priority === "number" && priority >= 1 && priority <= 100
          ? priority
          : 1;

      const restaurant = await Restaurant.findByIdAndUpdate(
        id,
        {
          $set: {
            "homePin.isPinned": true,
            "homePin.priority": homePriority,
            "homePin.pinnedAt": new Date(),
          },
        },
        { new: true }
      );

      if (!restaurant) {
        return NextResponse.json(
          { success: false, message: "Restaurant not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Home pin updated successfully",
        restaurant,
      });
    }

    if (pinType === "unpinHome") {
      const restaurant = await Restaurant.findByIdAndUpdate(
        id,
        {
          $set: {
            "homePin.isPinned": false,
            "homePin.priority": null,
            "homePin.pinnedAt": null,
          },
        },
        { new: true }
      );

      return NextResponse.json({
        success: true,
        message: "Home unpinned successfully",
        restaurant,
      });
    }

    /** ================= AREA PIN ================= */
  if (pinType === "area") {
      if (!Array.isArray(areaUpdates)) {
        return NextResponse.json(
          { success: false, message: "Invalid area updates" },
          { status: 400 }
        );
      }

      const areaPins =
        areaUpdates.length === 0
          ? []
          : areaUpdates.map((u) => ({
              areaId: u.areaId,
              isPinned: true,
              priority:
                typeof u.priority === "number" &&
                u.priority >= 1 &&
                u.priority <= 100
                  ? u.priority
                  : null,
              areaPinnedAt: new Date(),
            }));

      const restaurant = await Restaurant.findByIdAndUpdate(
        id,
        {
          $set: { areaPins },
          $unset: {
            pinnedAreas: "",
            pinnedAt: "",
            homePriority: "",
            pinnedToHome: "",
          },
        },
        { new: true }
      );

      return NextResponse.json({
        success: true,
        message: "Area pins updated successfully",
        restaurant,
      });
    }

    /** ================= UNPIN ALL ================= */
    if (pinType === "unpinAll") {
      const restaurant = await Restaurant.findByIdAndUpdate(
        id,
        {
          $set: {
            "homePin.isPinned": false,
            "homePin.priority": null,
            "homePin.pinnedAt": null,
            areaPins: [],
          },
        },
        { new: true }
      );

      return NextResponse.json({
        success: true,
        message: "Unpinned from all locations",
        restaurant,
      });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Pin failed" },
      { status: 500 }
    );
  }
}
