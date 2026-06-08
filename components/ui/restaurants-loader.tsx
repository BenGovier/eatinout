"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

const DEAL_CARDS = [
  { category: "Italian", badge: "Up to 50% off" },
  { category: "Pizza", badge: "Member voucher" },
  { category: "Bars & drinks", badge: "Use in venue" },
  { category: "Sunday lunch", badge: "Save when you eat out" },
]

const ROTATING_MESSAGES = [
  "Loading local offers",
  "Finding places to save",
  "Preparing your vouchers",
]

export function RestaurantsLoader() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % ROTATING_MESSAGES.length)
    }, 1600)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FFFBF7] px-6">
      {/* Logo */}
      <Image
        src="/eatinout-logo.webp"
        alt="Eatinout"
        width={180}
        height={46}
        className="h-10 w-auto"
        priority
      />

      {/* Swiping deal cards */}
      <div
        className="relative mt-10 h-32 w-full max-w-xs overflow-hidden"
        aria-hidden="true"
      >
        <div className="flex h-full animate-deal-swipe gap-4">
          {[...DEAL_CARDS, ...DEAL_CARDS].map((card, i) => (
            <div
              key={i}
              className="flex h-full w-44 shrink-0 flex-col justify-between rounded-2xl border border-[#f0e3d0] bg-white p-4 shadow-sm"
            >
              <span className="inline-flex w-fit items-center rounded-full bg-[#C8102E]/10 px-2.5 py-1 text-xs font-semibold text-[#C8102E]">
                {card.badge}
              </span>
              <div>
                <p className="text-base font-bold text-[#1a1a1a]">{card.category}</p>
                <p className="mt-0.5 text-xs text-gray-500">Show your voucher in venue</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Animated progress dots */}
      <div className="mt-8 flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-[#C8102E] animate-deal-pulse"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>

      {/* Copy */}
      <div className="mt-6 text-center" role="status" aria-live="polite">
        <p className="text-lg font-bold text-[#1a1a1a]">Finding restaurant deals near you</p>
        <p className="mt-1 text-sm text-gray-500">
          Member-only offers at restaurants, cafés and bars.
        </p>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[#C8102E]">
          {ROTATING_MESSAGES[messageIndex]}
        </p>
      </div>

      <style jsx>{`
        @keyframes deal-swipe {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-50% - 0.5rem));
          }
        }
        .animate-deal-swipe {
          animation: deal-swipe 9s linear infinite;
        }
        @keyframes deal-pulse {
          0%,
          100% {
            opacity: 0.25;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-deal-pulse {
          animation: deal-pulse 1.1s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-deal-swipe,
          .animate-deal-pulse {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
