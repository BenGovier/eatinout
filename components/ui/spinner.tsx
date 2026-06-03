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
      aria-label="Loading Eatinout restaurant discounts"
      aria-live="polite"
    >
      <span className="sr-only">Loading Eatinout, finding restaurant discounts near you.</span>
      
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
        <p className="mt-2 text-xs font-bold tracking-wide text-[#78716C] uppercase">Eatinout</p>
      )}
    </div>
  )

  // Full branded loader for centered=true
  if (centered) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#FFFBF7] z-50 animate-in fade-in duration-200">
        <div 
          className={cn("flex flex-col items-center text-center px-6 max-w-[300px]", className)}
          role="status"
          aria-label="Loading Eatinout restaurant discounts"
          aria-live="polite"
        >
          <span className="sr-only">Loading Eatinout, finding restaurant discounts near you.</span>
          
          {/* Logo with subtle pulse */}
          <div className="relative w-11 h-11">
            <Image
              src="/images/eatinouticon.webp"
              alt="Eatinout"
              fill
              className="object-contain animate-pulse motion-reduce:animate-none"
              priority
            />
          </div>
          
          {/* Brand label */}
          <p className="mt-3 text-[11px] font-bold tracking-[0.15em] text-[#78716C] uppercase">
            Eatinout
          </p>
          
          {/* Main headline */}
          <h1 className="mt-2 text-[22px] font-bold text-[#1C1917] leading-tight">
            Restaurant discounts for eating out
          </h1>
          
          {/* Supporting text */}
          <p className="mt-2 text-sm font-medium text-[#78716C]">
            Finding restaurant discounts near you
          </p>
          
          {/* Animated progress line */}
          <div className="mt-4 w-[100px] h-[2px] bg-[#E8E4DF] rounded-full overflow-hidden">
            <div 
              className="h-full w-1/3 bg-[#DC3545] rounded-full"
              style={{
                animation: "shimmer 1.5s ease-in-out infinite"
              }}
            />
          </div>
          
          {/* Bottom tagline */}
          <p className="mt-3 text-[11px] text-[#A8A29E] leading-relaxed">
            Use your discounts at restaurants, cafés and bars.
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
