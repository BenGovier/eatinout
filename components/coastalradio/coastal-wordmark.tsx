import { cn } from "@/lib/utils"

/**
 * PLACEHOLDER Coastal Radio wordmark.
 * No official Coastal Radio logo asset was supplied — this is a clearly
 * marked stand-in built from type + a radio-wave motif in the Coastal palette.
 * Swap for the official logo before launch.
 * Isolated to the /coastalradio campaign.
 */
export function CoastalWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} aria-label="Coastal Radio (placeholder logo)">
      {/* radio-wave / broadcast mark */}
      <svg viewBox="0 0 32 32" className="h-[1.35em] w-[1.35em] shrink-0" aria-hidden="true" fill="none">
        <circle cx="16" cy="16" r="4" fill="var(--cr-magenta)" />
        <path
          d="M9.5 22.5a9 9 0 0 1 0-13M6 26a14 14 0 0 1 0-20"
          stroke="var(--cr-purple)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M22.5 9.5a9 9 0 0 1 0 13M26 6a14 14 0 0 1 0 20"
          stroke="var(--cr-purple)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-[1.05em] font-extrabold uppercase tracking-tight text-[var(--cr-purple)]">
          Coastal
        </span>
        <span className="text-[0.62em] font-bold uppercase tracking-[0.34em] text-[var(--cr-magenta)]">
          Radio
        </span>
      </span>
    </span>
  )
}
