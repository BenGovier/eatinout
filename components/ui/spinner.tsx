import Image from "next/image"
import { cn } from "@/lib/utils"

interface SpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  centered?: boolean
}

export function Spinner({ className, size = "lg", centered = true }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-14 w-14",
    lg: "h-16 w-16",
    xl: "h-20 w-20"
  }

  // Compact inline spinner for centered=false
  const inlineSpinner = (
    <div 
      className={cn("relative flex flex-col items-center", className)} 
      role="status" 
      aria-label="Loading Eatinout member offers"
      aria-live="polite"
    >
      <span className="sr-only">Loading Eatinout, loading local member offers.</span>
      
      {/* Logo with subtle pulse */}
      <div className={cn("relative", sizeClasses[size])}>
        <Image
          src="/images/eatinouticon.webp"
          alt="Eatinout"
          fill
          className="object-contain animate-pulse motion-reduce:animate-none"
        />
      </div>
      
      {/* Show small text only for lg/xl inline loaders */}
      {(size === "lg" || size === "xl") && (
        <p className="mt-2 text-sm font-semibold text-[#1C1917]">Dine Out</p>
      )}
    </div>
  )

  // Full branded loader for centered=true
  if (centered) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#FFFBF7] z-50 animate-in fade-in duration-200">
        <div 
          className={cn("flex flex-col items-center text-center px-6 max-w-[280px]", className)}
          role="status"
          aria-label="Loading Eatinout member offers"
          aria-live="polite"
        >
          <span className="sr-only">Loading Eatinout, loading local member offers.</span>
          
          {/* Logo with subtle pulse */}
          <div className="relative w-12 h-12">
            <Image
              src="/images/eatinouticon.webp"
              alt="Eatinout"
              fill
              className="object-contain animate-pulse motion-reduce:animate-none"
              priority
            />
          </div>
          
          {/* Main headline */}
          <h1 className="mt-4 text-[28px] font-bold text-[#1C1917] leading-tight">
            Dine Out
          </h1>
          
          {/* Supporting text */}
          <p className="mt-2 text-sm font-medium text-[#78716C]">
            Loading local member offers
          </p>
          
          {/* Animated progress line */}
          <div className="mt-4 w-[120px] h-[2px] bg-[#E8E4DF] rounded-full overflow-hidden">
            <div 
              className="h-full w-1/3 bg-[#DC3545] rounded-full"
              style={{
                animation: "shimmer 1.5s ease-in-out infinite"
              }}
            />
          </div>
          
          {/* Tagline */}
          <p className="mt-3 text-xs text-[#A8A29E] leading-relaxed">
            Not delivery. Local offers to use when you eat out.
          </p>
        </div>
        
        {/* Shimmer animation keyframes */}
        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-150%); }
            100% { transform: translateX(450%); }
          }
        `}</style>
      </div>
    )
  }

  return inlineSpinner
}
