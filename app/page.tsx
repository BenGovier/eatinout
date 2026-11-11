import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import AsignupPage from "./asignup/page"
import AsignupLayout from "./asignup/layout"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

const ROLE_DESTINATIONS: Record<string, string> = {
  user: "/restaurants",
  admin: "/admin/dashboard",
  restaurant: "/dashboard",
}

async function getSignedInDestination(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value
    if (!token) return null

    const decoded = jwt.verify(token, JWT_SECRET)
    if (!decoded || typeof decoded !== "object") return null

    const { userId, role } = decoded as { userId?: unknown; role?: unknown }
    if (typeof userId !== "string" || !userId || typeof role !== "string") return null

    return ROLE_DESTINATIONS[role] ?? null
  } catch {
    return null
  }
}

export default async function RootPage() {
  const destination = await getSignedInDestination()

  // redirect() works by throwing, so it must stay outside the try/catch above.
  if (destination) {
    redirect(destination)
  }

  return (
    <AsignupLayout>
      <AsignupPage />
    </AsignupLayout>
  )
}
