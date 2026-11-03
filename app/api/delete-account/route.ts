import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { render } from "@react-email/render";
import { supabaseAdmin } from "@/lib/supabase/admin";
import sendEmail from "@/lib/sendEmail";
import AccountDeletionRequestEmail from "@/utils/email-templates/AccountDeletionRequestEmail";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST() {
  try {
    const cookieStore: any = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Missing auth token" },
        { status: 401 }
      );
    }

    let userId: string | null = null;
    let emailFromToken: string | null = null;

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      userId = decoded?.userId || null;
      emailFromToken = decoded?.email || null;
    } catch (err) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    let user: any = null;

    if (userId) {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("id, first_name, last_name, email")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        user = data;
      }
    }

    if (!user && emailFromToken) {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("id, first_name, last_name, email")
        .eq("email", emailFromToken)
        .maybeSingle();

      if (!error && data) {
        user = data;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const html = await render(
      AccountDeletionRequestEmail({
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        email: user.email,
        requestDate: new Date().toISOString(),
        userId: user.id,
      })
    );

    await sendEmail(
      "info@eatinout.com",
      "Account Deletion Request",
      html
    );

    return NextResponse.json({ success: true, message: "Deletion request submitted" });
  } catch (error: any) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit deletion request" },
      { status: 500 }
    );
  }
}
