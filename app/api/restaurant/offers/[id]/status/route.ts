import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase/admin";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let restaurantId: string | null = null;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        restaurantId?: string;
        role: string;
      };

      if (decoded.role !== "restaurant" && decoded.role !== "admin") {
        return NextResponse.json(
          { message: "Unauthorized - Not a restaurant or admin" },
          { status: 403 }
        );
      }

      if (decoded.role === "restaurant") {
        restaurantId = decoded.restaurantId || null;
      }
    } catch (error) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await req.json();

    if (!["active", "inactive", "expired", "pending", "rejected"].includes(status)) {
      return NextResponse.json(
        { message: "Invalid status value" },
        { status: 400 }
      );
    }

    // Fetch current offer from Supabase
    const { data: offer, error: fetchErr } = await supabaseAdmin
      .from("offers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !offer) {
      return NextResponse.json({ message: "Offer not found" }, { status: 404 });
    }

    let updatedStatus = status;
    let isDeactivated = offer.is_deactivated;

    if (status === "inactive") {
      isDeactivated = true;
      updatedStatus = "inactive";
    } else if (status === "active") {
      isDeactivated = false;
      const now = new Date();

      if (offer.start_date) {
        const start = new Date(offer.start_date);
        if (start > now) {
          return NextResponse.json(
            {
              message:
                "Cannot activate offer with future start date/time. The offer will be automatically activated on the start date/time.",
              success: false,
            },
            { status: 400 }
          );
        }
      }

      if (offer.expiry_date && !offer.run_until_further) {
        const expiry = new Date(offer.expiry_date);
        if (expiry < now) {
          return NextResponse.json(
            {
              message: "This offer has expired. Please update the end date to activate it.",
              success: false,
            },
            { status: 400 }
          );
        }
      }

      updatedStatus = "active";
    }

    if (status === "rejected" && !restaurantId) {
      updatedStatus = "rejected";
    }

    if (offer.status === "pending" && status !== "rejected") {
      const now = new Date();
      if (offer.start_date) {
        const start = new Date(offer.start_date);
        if (start > now) {
          updatedStatus = "inactive";
        } else {
          if (offer.expiry_date && !offer.run_until_further) {
            const expiry = new Date(offer.expiry_date);
            updatedStatus = expiry < now ? "expired" : "active";
          } else {
            updatedStatus = "active";
          }
        }
      } else {
        updatedStatus = "inactive";
      }
    }

    // Update in Supabase
    const { data: updatedOffer, error: updateErr } = await supabaseAdmin
      .from("offers")
      .update({
        status: updatedStatus,
        is_deactivated: isDeactivated,
      })
      .eq("id", id)
      .select("id, status")
      .single();

    if (updateErr) {
      console.error("Supabase error updating offer status:", updateErr);
      return NextResponse.json(
        { message: "Failed to update offer status", error: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Offer status updated to ${updatedStatus} successfully`,
      offer: {
        id: updatedOffer.id,
        status: updatedOffer.status,
      },
    });
  } catch (error: any) {
    console.error("Update offer status error:", error);
    return NextResponse.json(
      { message: "Failed to update offer status", error: error.message },
      { status: 500 }
    );
  }
}