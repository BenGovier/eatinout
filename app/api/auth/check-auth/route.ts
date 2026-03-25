import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import dotenv from "dotenv"

dotenv.config()
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function GET(req: NextRequest) {
  try {
    // Get the token from the cookies
    const token = req.cookies.get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ isAuthenticated: false })
    }

    // Verify the token
    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      const { payload } = await jwtVerify(token, secret)

      return NextResponse.json({
        isAuthenticated: true,
        user: {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
        },
      })
    } catch (error) {
      console.error("Token verification error:", error)
      return NextResponse.json({ isAuthenticated: false })
    }
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json({ isAuthenticated: false })
  }
}

