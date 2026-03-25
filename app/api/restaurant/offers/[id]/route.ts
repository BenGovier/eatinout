import { NextResponse } from "next/server";
import Offer from "@/models/Offer";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const offer = await Offer.findById(id);
    console.log("Offer found:", offer);
    if (!offer) {
      return new NextResponse("Offer not found", { status: 404 });
    }

    return NextResponse.json(offer);
  } catch (error) {
    console.error("Error getting offer:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
