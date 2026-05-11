"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"

/** Absorb React Strict Mode double effect; allow retry after a few seconds (e.g. back navigation). */
const checkoutDedupeKey = (email: string) => `signup_thankyou_checkout_ts_${email}`
const DEDUPE_MS = 4000

export default function SignUpThankYouPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = "Thank you"

    const run = async () => {
      const email = sessionStorage.getItem("checkoutEmail")
      if (!email) {
        setError("missing-email")
        toast.error("Session expired. Please sign up again.")
        router.replace("/sign-up")
        return
      }

      const dedupe = checkoutDedupeKey(email)
      const prev = sessionStorage.getItem(dedupe)
      const prevTs = prev ? parseInt(prev, 10) : 0
      if (prevTs && Date.now() - prevTs < DEDUPE_MS) {
        return
      }
      sessionStorage.setItem(dedupe, String(Date.now()))

      const priceId = sessionStorage.getItem("selectedPriceId") || undefined

      try {
        const response = await fetch("/api/payment/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            ...(priceId ? { priceId } : {}),
          }),
        })

        const data = await response.json()

        if (response.ok && data.url) {
          window.location.replace(data.url)
          return
        }

        throw new Error(data.error || "Failed to create checkout session")
      } catch (e) {
        console.error("Stripe checkout from thank-you page:", e)
        sessionStorage.removeItem(dedupe)
        toast.error("Failed to redirect to payment. Please try again.")
        setError("checkout-failed")
        router.replace("/sign-up")
      }
    }

    void run()
  }, [router])

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/delicious-gourmet-restaurant-food-spread.webp")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center space-y-6">
        <Link href="/" className="inline-block">
          <Image src="/eatinout-logo.webp" alt="Eatinout" width={180} height={72} className="mx-auto" priority />
        </Link>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
          {error ? (
            <p className="text-gray-800 text-base">Redirecting you back to sign up…</p>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div
                  className="h-10 w-10 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin"
                  aria-hidden
                />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Thank you for Signing in.</h1>
              <p className="text-gray-600 text-sm">Wait for redirect</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
