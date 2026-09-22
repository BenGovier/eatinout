import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * Official Coastal Radio DAB wordmark logo.
 * Full-color gradient mark on a transparent background. The "radioDAB" lettering
 * is black for light surfaces; pass `onDark` to use the white-lettering variant
 * so it stays legible on dark backgrounds (e.g. the footer).
 * Isolated to the /coastalradio campaign.
 */
export function CoastalWordmark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <Image
      src={onDark ? "/images/coastalradio/coastal-logo-ondark.png" : "/images/coastalradio/coastal-logo.png"}
      alt="Coastal Radio DAB"
      width={1509}
      height={546}
      priority
      className={cn("w-auto shrink-0", className)}
    />
  )
}
