import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Offer from "@/models/Offer";
import { verifyAdminToken } from "@/lib/auth-admin";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  const adminCheck = await verifyAdminToken(req);
  if (!adminCheck.success) {
    return NextResponse.json({ success: false, message: adminCheck.message }, { status: 401 });
  }

  await connectToDatabase();

  const now = new Date();
  const bulkOps: any[] = [];

  // Expire active offers whose expiryDate has passed
  const toExpire = await Offer.find({
    status: "active",
    expiryDate: { $lt: now },
    runUntilFurther: { $ne: true },
  }).select("_id");

  toExpire.forEach((offer: any) => {
    bulkOps.push({
      updateOne: {
        filter: { _id: offer._id },
        update: { $set: { status: "expired" } },
      },
    });
  });

  // Activate inactive offers whose startDate has passed
  const toActivate = await Offer.find({
    status: "inactive",
    startDate: { $lte: now },
    deactivated: { $ne: true },
    $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }, { runUntilFurther: true }],
  }).select("_id");

  toActivate.forEach((offer: any) => {
    bulkOps.push({
      updateOne: {
        filter: { _id: offer._id },
        update: { $set: { status: "active" } },
      },
    });
  });

  if (bulkOps.length > 0) {
    await Offer.bulkWrite(bulkOps);
  }

  return NextResponse.json({
    success: true,
    updated: bulkOps.length,
    expired: toExpire.length,
    activated: toActivate.length,
  });
}
