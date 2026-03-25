"use client"

import { useSession } from "next-auth/react"
import { useEffect, useRef } from "react"
import { clearUserLocationFromSessionStorage } from "@/lib/user-location-session"

/**
 * Clears `userLatLng` from sessionStorage when the user signs out (any sign-out path).
 */
export default function UserLocationSessionCleanup() {
  const { status } = useSession()
  const wasAuthenticatedRef = useRef(false)

  useEffect(() => {
    if (status === "authenticated") {
      wasAuthenticatedRef.current = true
    } else if (status === "unauthenticated" && wasAuthenticatedRef.current) {
      clearUserLocationFromSessionStorage()
      wasAuthenticatedRef.current = false
    }
  }, [status])

  return null
}
