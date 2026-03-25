import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function verifyAdminToken(req) {
  try {
    // Get the token from the cookies
    const token = req.cookies.get("auth_token")?.value

    if (!token) {
      return { success: false, message: "Unauthorized - No token" }
    }

    // Verify the token
    try {
      const decoded = jwt.verify(token, JWT_SECRET)

      // Check if user is an admin
      if (decoded.role !== "admin") {
        return { success: false, message: "Unauthorized - Not an admin" }
      }

      return {
        success: true,
        userId: decoded.userId,
        role: decoded.role,
      }
    } catch (error) {
      console.error("Token verification error:", error)
      return { success: false, message: "Unauthorized - Invalid token" }
    }
  } catch (error) {
    console.error("Auth verification error:", error)
    return { success: false, message: "An error occurred" }
  }
}

export async function verifyAdminAuth(req) {
  return await verifyAdminToken(req)
}

