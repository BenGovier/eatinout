"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Clock, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

export type WelcomeModalProps = {
  isOpen: boolean
  onClose: () => void
  onPrimary: () => void // Start free month
  onSecondary?: () => void // See how it works
  // Content controls
  showCountdown?: boolean // default true
  countdownTo?: string | null // ISO end time for intro price
  showVenuesCount?: boolean // default true
  venuesCount?: number // e.g., 250
  originalPriceText?: string // default "£8.99/m" - shown with strikethrough
  pricePerMonthText?: string // default "£4.99/m"
  trialText?: string // default "7 days free"
  // Optional risky cues (off by default)
  showViewerCount?: boolean
  viewerCount?: number
  showSpotsLeft?: boolean
  spotsLeft?: number
}

export function HowItWorksPopIn({
  isOpen: isOpenProp,
  onClose: onCloseProp,
  onPrimary,
  onSecondary,
  showCountdown = true,
  countdownTo,
  showVenuesCount = true,
  venuesCount = 250,
  originalPriceText = "£8.99/m",
  pricePerMonthText = "£4.99/m",
  trialText = "7 days free",
  showViewerCount = false,
  viewerCount = 23,
  showSpotsLeft = false,
  spotsLeft = 12,
}: WelcomeModalProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [countdownStatus, setCountdownStatus] = useState<"active" | "ending" | "ended">("active")
  const router = useRouter()

  useEffect(() => {
    if (!showCountdown || !countdownTo) {
      setTimeLeft(null)
      return
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const end = new Date(countdownTo).getTime()
      const diff = Math.floor((end - now) / 1000)

      if (diff <= 0) {
        setCountdownStatus("ended")
        setTimeLeft(0)
        // Fire countdown end event
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("welcome_modal_countdown_end", {
              detail: { remaining_seconds: 0, variant: "ended" },
            }),
          )
        }
      } else if (diff <= 60) {
        setCountdownStatus("ending")
        setTimeLeft(diff)
      } else {
        setCountdownStatus("active")
        setTimeLeft(diff)
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [showCountdown, countdownTo])

  useEffect(() => {
    if (isOpenProp && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("welcome_modal_open"))
    }
  }, [isOpenProp])

  useEffect(() => {
    if (!isOpenProp) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose()
      }
    }

    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [isOpenProp])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getCountdownText = () => {
    if (countdownStatus === "ended") return "Offer ended"
    if (countdownStatus === "ending") return "Ending soon"
    if (timeLeft !== null) return `Intro price ends in ${formatTime(timeLeft)}`
    return ""
  }

  const handleClose = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("welcome_modal_close"))
    }
    onCloseProp()
  }

  const handlePrimaryClick = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("welcome_modal_primary_click"))
    }
    router.push("/sign-up")
    handleClose()
  }

  const handleSecondaryClick = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("welcome_modal_secondary_click"))
    }
    router.push("/how-it-works")
    handleClose()
    if (onSecondary) {
      onSecondary()
    }
  }

  return (
    <AnimatePresence>
      {isOpenProp && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={handleClose}
            aria-hidden="true"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full max-w-[420px] max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl pointer-events-auto"
              role="dialog"
              aria-labelledby="welcome-modal-title"
              aria-modal="true"
            >
            {/* Background Image with Gradient */}
            <div className="absolute inset-0">
              <img src="/hero-food-vibrant.webp" alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/65 to-black/30" />
            </div>

            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/30 hover:bg-white/40 backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
              aria-label="Close welcome modal"
            >
              <X className="h-5 w-5 text-white stroke-[2.5]" />
            </button>

            <div className="relative z-10 flex-1 overflow-y-auto flex flex-col items-center justify-center text-center px-6 py-8">
              <h3
                id="welcome-modal-title"
                className="text-2xl md:text-3xl font-bold text-white mb-4"
                style={{ textShadow: "0 3px 12px rgba(0,0,0,0.8)" }}
              >
                New to EatinOut?
              </h3>
              

              <div className="mb-4 text-white">
                <div className="flex items-center justify-center gap-1 text-lg md:text-xl font-bold mb-1">
                  <span className="text-white/60 line-through text-lg">Was {originalPriceText}</span>
                  <span className="text-green-400 text-lg">&nbsp;Now {pricePerMonthText}</span>
                  <span className="text-white/80 text-lg">•</span>
                  <span className="text-green-400 text-lg">{trialText}</span>
                </div>
                {showVenuesCount && <p className="text-sm text-white/80 font-medium">{venuesCount}+ venues</p>}
              </div>

              <div className="mb-6 flex flex-col gap-2 w-full max-w-sm" role="status" aria-live="polite">
                {/* Urgency chip - countdown timer */}
                {showCountdown && timeLeft !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center justify-center gap-2 text-white rounded-full px-4 py-2.5 ${
                      countdownStatus === "ending" || countdownStatus === "ended"
                        ? "bg-red-600/90 animate-pulse"
                        : "bg-orange-600/80"
                    } backdrop-blur-sm`}
                  >
                    <Clock className="h-4 w-4" />
                    <span className="font-semibold text-sm">{getCountdownText()}</span>
                  </motion.div>
                )}

                {/* Reassurance chip - always shown */}
                <div className="flex items-center justify-center gap-2 text-white/90 bg-green-600/20 backdrop-blur-sm rounded-full px-4 py-2.5 border border-green-400/30">
                  <Shield className="h-4 w-4 text-green-400" />
                  <span className="font-medium text-sm">Cancel anytime — no commitment</span>
                </div>

                {showViewerCount && (
                  <div className="flex items-center justify-center gap-2 text-white/90 text-sm bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                    <span className="font-medium">{viewerCount} people viewing this offer</span>
                  </div>
                )}

                {showSpotsLeft && (
                  <div className="flex items-center justify-center gap-2 text-white/90 text-sm bg-orange-600/20 backdrop-blur-sm rounded-full px-4 py-2 border border-orange-400/30">
                    <span className="font-medium">Only {spotsLeft} spots left at this price</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-3 w-full max-w-sm">
                <Button
                  onClick={handlePrimaryClick}
                  className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 h-auto text-base w-full rounded-full shadow-lg"
                  aria-label="Start your free month subscription"
                >
                  Start free trial → £4.99/month
                </Button>
                <Button
                  onClick={handleSecondaryClick}
                  variant="ghost"
                  className="text-white hover:bg-white/10 hover:text-white font-medium px-6 py-2 h-auto text-sm"
                  aria-label="Learn more about how EatinOut works"
                >
                  See how it works
                </Button>

                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  Then {pricePerMonthText}. Auto-renews. Cancel anytime.
                </p>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export function HowItWorksPopInLegacy() {
  const [isVisible, setIsVisible] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const isDismissed = localStorage.getItem("howItWorksDismissed")
    const isLoggedIn = false // Replace with actual auth check

    if (!isDismissed && !isLoggedIn) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem("howItWorksDismissed", "true")
    setIsVisible(false)
  }

  const handlePrimary = () => {
    localStorage.setItem("howItWorksDismissed", "true")
    setIsVisible(false)
    // Navigate to subscription page or trigger subscription flow
    router.push("/subscribe")
  }

  const handleSecondary = () => {
    localStorage.setItem("howItWorksDismissed", "true")
    setIsVisible(false)
    router.push("/how-it-works")
  }

  // Calculate countdown end time (9 minutes from now)
  const countdownEnd = new Date(Date.now() + 9 * 60 * 1000).toISOString()

  return (
    <HowItWorksPopIn
      isOpen={isVisible}
      onClose={handleClose}
      onPrimary={handlePrimary}
      onSecondary={handleSecondary}
      showCountdown={true}
      countdownTo={countdownEnd}
      showVenuesCount={true}
      venuesCount={250}
      originalPriceText="£8.99/m"
      pricePerMonthText="£4.99/m"
      trialText="7 days free"
      showViewerCount={false}
      showSpotsLeft={false}
    />
  )
}
