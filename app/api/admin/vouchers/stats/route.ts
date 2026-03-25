import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Voucher from "@/models/Voucher";
import { verifyAdminToken } from "@/lib/auth-admin";

export async function GET(req: Request) {
  try {
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json(
        { message: adminCheck.message },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const today = new Date();
    
    // Get all counts in parallel
    const [
      total,
      active,
      inactive,
      expired,
      used,
      fullyUsed
    ] = await Promise.all([
      Voucher.countDocuments(),
      Voucher.countDocuments({ isActive: true }),
      Voucher.countDocuments({ isActive: false }),
      Voucher.countDocuments({ expiryDate: { $lt: today } }),
      Voucher.countDocuments({ currentUses: { $gt: 0 } }),
      Voucher.countDocuments({ $expr: { $gte: ["$currentUses", "$maxUses"] } })
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        total,
        active,
        inactive,
        expired,
        used,
        fullyUsed
      }
    });
  } catch (error: any) {
    console.error("Error fetching voucher stats:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
