"use client"

import Image from "next/image"

export function RestaurantsLoader() {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#FDF6EC] px-6">
      {/* Logo */}
      <Image
        src="/eatinout-logo.webp"
        alt="EatinOut"
        width={200}
        height={50}
        className="h-11 w-auto"
        priority
      />

      {/* Branded search / progress line with pulsing dots */}
      <div className="mt-10 w-full max-w-xs" aria-hidden="true">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#efe2cf]">
          <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-[#C8102E] animate-search-line" />
        </div>
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-[#C8102E] animate-deal-pulse"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>
      </div>

      {/* Copy */}
      <div className="mt-8 max-w-sm text-center" role="status" aria-live="polite">
        <p className="text-xl font-bold text-[#1a1a1a] text-balance">
          Finding restaurant deals near you
        </p>
        <p className="mt-1.5 text-sm text-gray-500 text-pretty">
          Checking local offers at restaurants, cafés and bars.
        </p>
        <p className="mt-3 text-xs text-gray-400">This will only take a moment.</p>
      </div>

      <style jsx>{`
        @keyframes search-line {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
        .animate-search-line {
          animation: search-line 1.3s ease-in-out infinite;
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
          .animate-search-line,
          .animate-deal-pulse {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
