import Image from "next/image"

/**
 * PLACEHOLDER Coastal Radio wordmark.
 * No approved Coastal Radio logo asset exists in the project, so this is a
 * typographic stand-in styled in the Coastal purple/magenta palette.
 * Swap for the official supplied logo before launch.
 */
export function CoastalWordmark({
  className,
  tone = "light",
}: {
  className?: string
  /** light = for dark backgrounds, dark = for light backgrounds */
  tone?: "light" | "dark"
}) {
  const text = tone === "light" ? "text-white" : "text-[var(--cr-purple)]"
  const dot = tone === "light" ? "bg-[var(--cr-magenta)]" : "bg-[var(--cr-magenta)]"
  return (
    <span className={`inline-flex items-baseline gap-1.5 font-extrabold tracking-tight ${text} ${className ?? ""}`}>
      <span className="relative">
        Coastal
        <span className={`absolute -right-2 top-0 h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      </span>
      <span className="font-medium opacity-80">Radio</span>
    </span>
  )
}

/**
 * Co-branded lockup: Coastal Radio  ×  EatinOut.
 * Used once in the header and once in the final CTA — never a logo wall.
 */
export function CoBrandLockup({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <CoastalWordmark tone={tone} className="text-base sm:text-lg" />
      <span className={tone === "light" ? "text-white/50" : "text-black/30"} aria-hidden>
        &times;
      </span>
      <Image
        src="/eatinout-logo.webp"
        alt="EatinOut"
        width={600}
        height={200}
        priority
        className={`h-6 w-auto sm:h-7 ${tone === "light" ? "brightness-0 invert" : ""}`}
      />
    </div>
  )
}
