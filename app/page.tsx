import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import AsignupPage from "./asignup/page"
import AsignupLayout from "./asignup/layout"
import User from "@/models/User"
import connectToDatabase from "@/lib/mongodb"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export default async function RootPage() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
        await connectToDatabase()
        const user = await User.findById(decoded.userId).select('subscriptionStatus role')
        if (user && user.role === "user" && user.subscriptionStatus !== "inactive") {
          redirect("/restaurants")
        }
      } catch {
        // Invalid/expired token – show landing page
      }
    }
  } catch {
    // Cookie read error – show landing page (fail open for guests)
  }
  
  // Show asignup landing page if no token or invalid subscription
  return (
    <AsignupLayout>
      <AsignupPage />
    </AsignupLayout>
  )
}

