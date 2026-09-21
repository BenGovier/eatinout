import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * Official Coastal wordmark logo.
 * Full-color gradient mark on a transparent background, so it reads on both
 * the pale header and the dark footer.
 * Isolated to the /coastalradio campaign.
 */
export function CoastalWordmark({ className }: { className?: string }) {
  return (
    <Image
      src="/images/coastalradio/coastal-logo.png"
      alt="Coastal"
      width={1033}
      height={383}
      priority
      className={cn("w-auto shrink-0", className)}
    />
  )
}
