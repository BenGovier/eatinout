import { type NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Lead from "@/models/Lead";
import { verifyAdminToken } from "@/lib/auth-admin";

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminToken(req);
    if (!adminCheck.success) {
      return NextResponse.json({ success: false, message: adminCheck.message || "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Only get unconverted leads
    const query = { converted: false };

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      leads: leads.map((lead: any) => ({
        ...lead,
        _id: lead._id.toString(),
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      stats: {
        totalUnconvertedLeads: total,
      }
    });
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch leads", error: error.message },
      { status: 500 }
    );
  }
}
