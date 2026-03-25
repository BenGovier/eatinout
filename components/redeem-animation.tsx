"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Wallet } from "lucide-react"

interface RedeemAnimationProps {
  isVisible: boolean
  onComplete: () => void
}

export function RedeemAnimation({ isVisible, onComplete }: RedeemAnimationProps) {
  const [showAnimation, setShowAnimation] = useState(isVisible)

  useEffect(() => {
    setShowAnimation(isVisible)

    if (isVisible) {
      // Auto-hide animation after it completes
      const timer = setTimeout(() => {
        setShowAnimation(false)
        onComplete()
      }, 1500) // Animation duration + a little extra

      return () => clearTimeout(timer)
    }
  }, [isVisible, onComplete])

  return (
    <AnimatePresence>
      {showAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ scale: 1, y: 0, opacity: 1 }}
            animate={[
              { scale: 1.2, y: 0, opacity: 1, transition: { duration: 0.2 } },
              { scale: 1, y: 0, opacity: 1, transition: { duration: 0.2 } },
              { scale: 0.8, y: 300, opacity: 0.8, transition: { duration: 0.6 } },
            ]}
            exit={{ opacity: 0 }}
            className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center"
          >
            <div className="text-xl font-bold mb-2">Offer Redeemed!</div>
            <div className="text-gray-600 mb-4">Added to your wallet</div>
            <div className="text-red-600">
              <Wallet className="w-12 h-12" />
            </div>
          </motion.div>

          {/* Wallet target indicator at bottom of screen */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0], transition: { delay: 0.8, duration: 0.4 } }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white rounded-full p-3"
          >
            <Wallet className="w-8 h-8" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

