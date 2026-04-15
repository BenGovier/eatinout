"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

type UserRole = "user" | "restaurant" | "admin"

interface VerifyTokenUser {
  userId: string
  email: string
  role: UserRole
  firstName?: string
  lastName?: string
  subscriptionStatus?: "active" | "inactive" | "cancelled"
}

interface UseVerifyTokenResult {
  /** Whether the verification request is in progress */
  isVerifying: boolean
  /** User data if verification succeeded */
  user: VerifyTokenUser | null
  /** Error message to display (null when no error or for normal 401 guest) */
  verificationError: string | null
  /** Whether verification completed (success or handled failure) */
  isVerified: boolean
  /** Manually retry verification */
  retry: () => Promise<void>
}

const ROLE_TO_DASHBOARD: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  restaurant: "/dashboard",
  user: "/restaurants",
}

export function useVerifyToken(options?: {
  /** If true, redirect to dashboard on success. Default: true */
  redirectOnSuccess?: boolean
  /** If true, show error message when verification fails (e.g. expired token). Default: true when token exists */
  showErrorOnFailure?: boolean
}): UseVerifyTokenResult {
  const router = useRouter()
  const redirectOnSuccess = options?.redirectOnSuccess ?? true
  const [isVerifying, setIsVerifying] = useState(true)
  const [user, setUser] = useState<VerifyTokenUser | null>(null)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)

  const verify = useCallback(async () => {
    setIsVerifying(true)
    setVerificationError(null)

    try {
      const response = await fetch("/api/auth/verify-token", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })

      let data: { success?: boolean; user?: VerifyTokenUser; error?: string } = {}
      try {
        const text = await response.text()
        if (text) {
          data = JSON.parse(text) as typeof data
        }
      } catch {
        // Non-JSON response (e.g. 500 HTML page)
        setVerificationError("Unable to verify your session. Please try again.")
        setIsVerified(true)
        return
      }

      if (response.ok && data.success && data.user) {
        setUser(data.user)
        setVerificationError(null)

        if (redirectOnSuccess && data.user.role) {
          const dashboardRoute = ROLE_TO_DASHBOARD[data.user.role as UserRole] ?? "/restaurants"
          router.replace(dashboardRoute)
        }
        setIsVerified(true)
        return
      }

      // Verification failed - API returns 200 with success: false
      const errorMessage = data.error || "Your session has expired or is invalid."
      const shouldHideError = /missing|no token|user not found/i.test(errorMessage)
      const shouldShowError = options?.showErrorOnFailure ?? !shouldHideError
      if (shouldShowError) {
        setVerificationError(errorMessage)
      }
      setUser(null)
      setIsVerified(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("Verification error:", err)
      setVerificationError("Connection error. Please check your network and try again.")
      setUser(null)
      setIsVerified(true)
    } finally {
      setIsVerifying(false)
    }
  }, [router, redirectOnSuccess, options?.showErrorOnFailure])

  useEffect(() => {
    verify()
  }, [verify])

  return {
    isVerifying,
    user,
    verificationError,
    isVerified,
    retry: verify,
  }
}
