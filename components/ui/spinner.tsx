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

  const spinner = (
    <div className={cn("relative", sizeClasses[size])} role="status" aria-label="Loading">

      {/* Ripple 1 */}
      <div
        className={cn(
          "absolute inset-0 rounded-full border-4 border-primary/40",
          "animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"
        )}
      />

      {/* Ripple 2 (closer to center now) */}
      <div
        className={cn(
          "absolute inset-[8%] rounded-full border-4 border-primary/60",
          "animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite_0.4s]"
        )}
      />

      {/* Bigger Logo */}
      <div className="absolute inset-[12%] flex items-center justify-center">
        <Image
          src="/images/eatinouticon.webp"
          alt="logo"
          fill
          className="object-contain animate-pulse"
        />
      </div>

    </div>
  )

  if (centered) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
        {spinner}
      </div>
    )
  }

  return spinner
}
