"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"

export default function AbandonedOfferPage() {
  const [timeLeft, setTimeLeft] = useState(8 * 60) // 8 minutes in seconds
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleComplete = async () => {
    // Read email captured during login
    const email = typeof window !== "undefined" ? sessionStorage.getItem("checkoutEmail") : null
    if (!email) {
      router.push("/sign-in")
      return
    }
    try {
      const response = await fetch("/api/payment/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const { url } = await response.json()
      if (response.ok && url) {
        window.location.replace(url)
      } else {
        throw new Error("Failed to create Stripe Checkout session")
      }
    } catch (e) {
      router.push("/sign-in")
    }
  }

  const handleLater = async () => {
    try {
      // Logout user to clear auth cookies and prevent redirect loops
      await fetch("/api/auth/logout", {
        method: "POST",
      })
      
      // Clear NextAuth session
      await signOut({ callbackUrl: "/", redirect: false })
      
      // Clear client-side auth token cookie
      document.cookie = "auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;"
      
      // Clear sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("checkoutEmail")
      }
      
      // Redirect to home page
      router.push("/")
    } catch (error) {
      console.error("Error during logout:", error)
      // Still redirect even if logout fails
      router.push("/")
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-black">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('/vibrant-lifestyle-dining-scene.webp')`,
          filter: "blur(4px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0.9) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg mx-auto p-8 text-center">
        <div className="mb-3 mt-5 pt-8">
          <Image
            src="/images/eatinoutlogo.webp"
            alt="Eatinout"
            width={160}
            height={40}
            className="mx-auto"
          />
        </div>

        <h1 className="text-5xl font-black text-white mb-4 leading-tight tracking-tight font-sans">
          Hurry! Your free 7-day trial awaits!
        </h1>

        <p className="text-xl text-white/90 mb-12 font-semibold leading-relaxed">
          More reasons to go out. Eat. Drink. Save.
        </p>

        <div className="mb-12">
          <div
            className="inline-block text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl relative"
            style={{ backgroundColor: "#eb221c" }}
          >
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300 rounded-full animate-bounce" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-200 rounded-full animate-ping" />
            <div className="absolute top-1 left-2 w-1 h-1 bg-white rounded-full animate-pulse" />
            <span className="relative z-10">🎉7 Days On Us!</span>
          </div>
        </div>

        <div className="mb-12">
          <p className="text-white/80 text-base mb-6 font-semibold">
            Only minutes left to claim this
          </p>
          <div className="relative inline-block">
            <div className="w-36 h-36 rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-2xl relative">
              <div
                className="absolute inset-0 rounded-full border-4 animate-pulse"
                style={{ borderColor: "#eb221c" }}
              />
              <div
                className="absolute inset-2 rounded-full border-2 animate-ping"
                style={{ borderColor: "#eb221c" }}
              />
              <span className="text-3xl font-black text-white tabular-nums relative z-10">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6 mb-12">
          <Button
            onClick={handleComplete}
            className="w-full text-white font-bold py-6 text-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
            style={{ backgroundColor: "#eb221c" }}
          >
            Unlock My Deals Now
          </Button>

          <button
            onClick={handleLater}
            className="text-white/70 hover:text-white text-base font-medium transition-colors"
          >
            Maybe later
          </button>
        </div>

        <div className="text-sm text-white/60 font-medium">
          No strings. Cancel anytime. Instant access.
        </div>
      </div>
    </div>
  )
}
