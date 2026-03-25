import { NextResponse } from "next/server";

export async function POST(req: any) {
  try {
    // Create response
    const response = NextResponse.json({
      message: "Logged out successfully",
    });

    // Clear auth cookie
    response.cookies.set({
      name: "auth_token",
      value: "",
      path: "/",
      maxAge: 0,
    });

    // Clear user role cookie
    response.cookies.set({
      name: "user_role",
      value: "",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { message: "An error occurred during logout" },
      { status: 500 }
    );
  }
}
