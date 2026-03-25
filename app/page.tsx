import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import WelcomePage from "./(marketing)/welcome/page"
import MarketingLayout from "./(marketing)/layout"
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
        // Invalid/expired token – show welcome page
      }
    }
  } catch {
    // Cookie read error – show welcome page (fail open for guests)
  }
  
  // Show welcome page if no token or invalid subscription
  return (
    <MarketingLayout>
      <WelcomePage />
    </MarketingLayout>
  )
}

