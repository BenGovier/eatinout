import { CalendarClock, ChevronDown, ImageIcon, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type OfferImageTreatment = "photo" | "artwork"

export interface NationalOfferCardPreviewProps {
  brandName: string
  brandInitials: string
  headline: string
  discountLabel: string
  description: string
  expiryLabel?: string
  terms: string[]
  imageTreatment: OfferImageTreatment
  className?: string
}

function OfferImagePlaceholder({ treatment }: { treatment: OfferImageTreatment }) {
  if (treatment === "photo") {
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-amber-200 via-orange-300 to-rose-400">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(255,255,255,0.55),transparent_45%)]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white">
          <ImageIcon className="h-7 w-7 drop-shadow" aria-hidden="true" />
          <span className="text-xs font-semibold drop-shadow">Offer photo fills 16:9 (cropped)</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center bg-slate-100">
      <div className="flex aspect-[4/3] h-full flex-col items-center justify-center gap-1 border-x border-dashed border-slate-300 bg-gradient-to-br from-teal-50 to-teal-200 px-3 text-center text-teal-900">
        <ImageIcon className="h-6 w-6" aria-hidden="true" />
        <span className="text-xs font-semibold leading-tight">Approved artwork shown in full</span>
        <span className="text-[10px] leading-tight text-teal-800">4:3 example, letterboxed</span>
      </div>
    </div>
  )
}

export function NationalOfferCardPreview({
  brandName,
  brandInitials,
  headline,
  discountLabel,
  description,
  expiryLabel,
  terms,
  imageTreatment,
  className,
}: NationalOfferCardPreviewProps) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
      aria-label={`${brandName}: ${headline}`}
    >
      <div className="relative">
        <OfferImagePlaceholder treatment={imageTreatment} />
        <span className="absolute left-3 top-3 rounded-full bg-[var(--eo-red)] px-2.5 py-1 text-xs font-bold text-white shadow">
          {discountLabel}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1"
            aria-hidden="true"
          >
            <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[11px] font-bold text-slate-500">
              {brandInitials}
            </div>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--eo-ink)]">{brandName}</p>
            <p className="text-xs text-[var(--eo-muted)]">National offer</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-balance text-lg font-bold leading-snug text-[var(--eo-ink)]">{headline}</h3>
          <p className="text-pretty text-sm leading-relaxed text-[var(--eo-muted)]">{description}</p>
        </div>

        {expiryLabel ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--eo-ink)]">
            <CalendarClock className="h-4 w-4 text-[var(--eo-teal)]" aria-hidden="true" />
            {expiryLabel}
          </p>
        ) : null}

        <details className="group rounded-lg bg-[var(--eo-bg)] px-3 py-2 text-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-[var(--eo-ink)] [&::-webkit-details-marker]:hidden">
            Offer terms
            <ChevronDown
              className="h-4 w-4 text-[var(--eo-muted)] transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed text-[var(--eo-muted)]">
            {terms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </details>

        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            className="h-11 w-full rounded-xl bg-[var(--eo-red)] text-base font-semibold text-white hover:bg-[var(--eo-red)]/90"
          >
            Get Deal
          </Button>
          <p className="flex items-center justify-center gap-1 text-[11px] text-[var(--eo-muted)]">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Free EatinOut account needed to claim
          </p>
        </div>
      </div>
    </article>
  )
}
