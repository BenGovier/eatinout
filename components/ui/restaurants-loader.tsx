"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { Check } from "lucide-react"

const DEAL_CARDS = [
  { category: "Italian", headline: "Up to 50% off", support: "Use when you visit" },
  { category: "Sunday lunch", headline: "Save when you eat out", support: "Show your voucher" },
  { category: "Bars & cafés", headline: "Member-only offers", support: "Use in venue" },
  { category: "Local restaurants", headline: "500+ places", support: "Ready to save" },
]

const ROTATING_MESSAGES = [
  "Checking local offers",
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
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#FDF6EC] px-6">
      {/* Logo */}
      <Image
        src="/eatinout-logo.webp"
        alt="Eatinout"
        width={200}
        height={50}
        className="h-11 w-auto"
        priority
      />

      {/* Swiping voucher / deal cards */}
      <div
        className="relative mt-10 h-36 w-full max-w-xs overflow-hidden"
        aria-hidden="true"
      >
        {/* Soft cream fade on the edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#FDF6EC] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#FDF6EC] to-transparent" />

        <div className="flex h-full animate-deal-swipe gap-4">
          {[...DEAL_CARDS, ...DEAL_CARDS].map((card, i) => (
            <div
              key={i}
              className="flex h-full w-48 shrink-0 flex-col justify-between rounded-2xl border border-[#efe2cf] bg-white p-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)]"
            >
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#C8102E]/10 px-2.5 py-1 text-[11px] font-semibold text-[#C8102E]">
                <Check className="h-3 w-3" strokeWidth={3} />
                Member offer
              </span>
              <div>
                <p className="text-sm font-medium text-gray-500">{card.category}</p>
                <p className="text-lg font-bold leading-tight text-[#1a1a1a]">{card.headline}</p>
                <p className="mt-0.5 text-xs text-gray-400">{card.support}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Animated pulse dots */}
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
      <div className="mt-6 max-w-sm text-center" role="status" aria-live="polite">
        <p className="text-xl font-bold text-[#1a1a1a] text-balance">
          Finding restaurant deals near you
        </p>
        <p className="mt-1.5 text-sm text-gray-500 text-pretty">
          Loading member-only offers at restaurants, cafés and bars.
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#C8102E]">
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
          animation: deal-swipe 10s linear infinite;
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
