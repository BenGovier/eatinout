import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, Clock, CalendarDays, ChevronRight, ChevronDown, Lock, Sparkles, Loader2, RefreshCw, Ticket } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"

interface Deal {
  id: string
  restaurantId?: string
  restaurantName: string
  offerTitle: string
  validDays: string
  imageUrl: string
  cuisine: string
  location: string
  dineIn?: boolean
  dineOut?: boolean
  description: string
  terms?: string
  validHours?: string
  bookingRequirement: string
  associatedId: string
}

interface RestaurantDealProps {
  deal: Deal
  phoneNumber: string
  membersUsed: number
  onRedeem: (offerId: string, associatedId: string) => void
  isLoading: string | null
  style?: React.CSSProperties
  featured?: boolean
  defaultExpanded?: boolean
  /** Signed-in customers only. When omitted, the original Redeem behaviour is kept. */
  premiumAccess?: PremiumAccessState
  onUnlock?: (offerId: string) => void
  onRetryAccess?: () => void
}

export type PremiumAccessState = "checking" | "granted" | "denied" | "error"

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export type OfferDeal = Deal & { isPinned?: boolean }

interface OfferActionProps {
  deal: Deal
  canViewFullTerms: boolean
  premiumAccess?: PremiumAccessState
  onRedeem: (offerId: string, associatedId: string) => void
  onUnlock?: (offerId: string) => void
  onRetryAccess?: () => void
  isLoading: string | null
  loggedOutLabel?: string
}

/** The single membership-dependent action for an offer. Shared by every offer surface. */
export function OfferAction({
  deal,
  canViewFullTerms,
  premiumAccess,
  onRedeem,
  onUnlock,
  onRetryAccess,
  isLoading,
  loggedOutLabel = "Unlock this offer",
}: OfferActionProps) {
  if (canViewFullTerms && premiumAccess === "checking") {
    return (
      <Button
        disabled
        aria-live="polite"
        className="w-full bg-primary/80 text-white font-bold py-3 text-base rounded-lg"
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
        Checking your membership...
      </Button>
    )
  }

  if (canViewFullTerms && premiumAccess === "error") {
    return (
      <div role="status" className="rounded-xl border border-lines bg-soft-bg/60 p-4 flex flex-col gap-3">
        <p className="text-sm text-dark-ink/80 leading-relaxed">
          We couldn&apos;t check your membership just now. Please try again in a moment.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onRetryAccess}
          className="w-full rounded-lg border-primary/30 text-primary font-semibold hover:bg-primary/5 hover:text-primary"
        >
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          Try again
        </Button>
      </div>
    )
  }

  if (canViewFullTerms && premiumAccess === "denied") {
    return (
      <Button
        type="button"
        onClick={() => onUnlock?.(deal.id)}
        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 text-base rounded-lg shadow-[0_4px_14px_rgba(227,30,36,0.25)] focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <Lock className="h-4 w-4 mr-2" aria-hidden="true" />
        Unlock this offer
      </Button>
    )
  }

  return (
    <Button
      onClick={() => onRedeem(deal.id, deal.restaurantId || "")}
      className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 text-base rounded-lg shadow-[0_4px_14px_rgba(227,30,36,0.25)] focus:ring-2 focus:ring-primary focus:ring-offset-2"
      disabled={isLoading === deal.id}
    >
      {isLoading === deal.id ? "Adding..." : !canViewFullTerms ? loggedOutLabel : "Add to wallet"}
    </Button>
  )
}

/** Short, human summary of the configured days, e.g. "Every day" or "Mon, Tue, Wed". */
export function summariseValidDays(validDays?: string): string | null {
  if (!validDays?.trim()) return null
  const days = parseValidDays(validDays)
  return days.length === 7 ? "Every day" : days.join(", ")
}

interface RestaurantOfferCardProps {
  deal: OfferDeal
  onView: (offerId: string) => void
  premiumAccess?: PremiumAccessState
  style?: React.CSSProperties
}

/** Compact, scannable offer row. All details and actions live in the offer-detail sheet. */
export function RestaurantOfferCard({ deal, onView, premiumAccess, style }: RestaurantOfferCardProps) {
  const daysSummary = summariseValidDays(deal.validDays)
  const isLocked = premiumAccess === "denied"

  return (
    <button
      type="button"
      onClick={() => onView(deal.id)}
      aria-haspopup="dialog"
      style={style}
      className="group flex w-full items-start gap-3.5 rounded-2xl border border-lines bg-white p-4 text-left shadow-[0_2px_10px_rgba(15,23,42,0.05)] transition-[border-color,box-shadow] animate-in fade-in slide-in-from-bottom-2 duration-500 hover:border-primary/30 hover:shadow-[0_6px_18px_rgba(15,23,42,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <span className="mt-0.5 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Ticket className="h-5 w-5 text-primary" aria-hidden="true" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        {(deal.isPinned || isLocked) && (
          <span className="flex flex-wrap items-center gap-1.5">
            {deal.isPinned && (
              <Badge className="border-0 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/10">
                <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                Featured
              </Badge>
            )}
            {isLocked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-soft-bg px-2 py-0.5 text-[11px] font-semibold text-dark-ink/70">
                <Lock className="h-3 w-3" aria-hidden="true" />
                Premium
              </span>
            )}
          </span>
        )}

        <span
          className="text-base font-bold leading-snug text-dark-ink text-pretty break-words"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {deal.offerTitle}
        </span>

        {deal.description && (
          <span className="line-clamp-2 text-sm leading-relaxed text-dark-ink/65">{deal.description}</span>
        )}

        {(daysSummary || deal.validHours) && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-dark-ink/70">
            {daysSummary && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {daysSummary}
              </span>
            )}
            {deal.validHours && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {deal.validHours}
              </span>
            )}
          </span>
        )}

        <span className="mt-1 inline-flex items-center gap-0.5 text-sm font-semibold text-primary">
          View offer
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </span>
    </button>
  )
}

export function parseValidDays(validDaysStr: string): string[] {
  if (validDaysStr.toLowerCase().trim() === "all week") {
    return weekDays
  }
  return validDaysStr
    .split(",")
    .map((d) => {
      const day = d.trim()
      return day.substring(0, 3).charAt(0).toUpperCase() + day.substring(1, 3).toLowerCase()
      // Take first 3 letters, capitalize first, lowercase next 2
    })
    .filter(Boolean)
}

export function RestaurantDeal({
  deal,
  phoneNumber,
  membersUsed,
  onRedeem,
  isLoading,
  style,
  featured = false,
  defaultExpanded = false,
  premiumAccess,
  onUnlock,
  onRetryAccess,
}: RestaurantDealProps) {
  const [showScrollArrow, setShowScrollArrow] = useState(true)
  const [expanded, setExpanded] = useState(featured || defaultExpanded)
  const validDaysArray = parseValidDays(deal.validDays)
  const offerLocation = deal.location.split(",")[0].trim()
  const termsLines =
    typeof deal.terms === "string"
      ? deal.terms.split("\n").filter((line) => line.trim())
      : [];

  const { isAuthenticated, user } = useAuth()

  // Only regular users (not admin or restaurant) should see full T&C
  const canViewFullTerms = isAuthenticated && user?.role === "user"

  useEffect(() => {
    const timer = setTimeout(() => setShowScrollArrow(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  // Open the card when it becomes a deep-link target
  useEffect(() => {
    if (defaultExpanded) setExpanded(true)
  }, [defaultExpanded])

  // Shared offer details block (used by featured cards and expanded compact cards)
  const detailsBlock = (
    <div className="space-y-6">
      {deal.description && (
        <p className="text-dark-ink/90 text-base leading-relaxed text-pretty">{deal.description}</p>
      )}

      <div className="space-y-4">
        {/* When you can use it */}
        <div className="rounded-xl border border-lines bg-soft-bg/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold text-dark-ink">When you can use it</p>
          </div>
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-thin scrollbar-thumb-lines scrollbar-track-transparent pb-1 md:overflow-visible">
              {validDaysArray.map((day) => {
                const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                const todayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
                const today = weekDays[(todayIndex + 6) % 7]; // shift so Sunday=0 → "Sun"
                // const isToday = day === today; // compare current day with today

                return (
                  <div
                    key={day}
                    className="snap-start flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors border-lines bg-white text-dark-ink"
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {showScrollArrow && validDaysArray.length > 3 && (
              <div className="absolute right-1 top-1/2 -translate-y-1/2 animate-bounce md:hidden">
                <ChevronRight className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
            )}
          </div>

          {deal.validHours && (
            <div className="flex items-center gap-2 text-dark-ink mt-3 pt-3 border-t border-lines/70">
              <Clock className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium">{deal.validHours}</span>
            </div>
          )}
        </div>

        {/* Before you visit */}
        <div className="rounded-xl border border-lines bg-soft-bg/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold text-dark-ink">Before you visit</p>
          </div>
          {deal.bookingRequirement === "mandatory" && (
            <p className="text-sm text-dark-ink/90 leading-relaxed">
              You are required to book ahead for this deal, call{" "}
              <a href={`tel:${phoneNumber}`} className="font-semibold text-primary">
                {phoneNumber}
              </a>
            </p>
          )}
          {deal.bookingRequirement === "recommended" && (
            <p className="text-sm text-dark-ink/90 leading-relaxed">
              It&apos;s recommended you book but not always essential, call{" "}
              <a href={`tel:${phoneNumber}`} className="font-semibold text-primary">
                {phoneNumber}
              </a>
            </p>
          )}
          {deal.bookingRequirement === "notNeeded" && (
            <p className="text-sm text-dark-ink/90 leading-relaxed">You do not need to call ahead or book.</p>
          )}
        </div>
      </div>

      {termsLines.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-dark-ink mb-2">Terms</p>
          {canViewFullTerms ? (
            <div className="rounded-xl border border-lines bg-soft-bg/60 p-4">
              <div className="text-sm text-dark-ink/80 leading-relaxed space-y-2">
                {termsLines.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl border border-primary/15 bg-[#FFF6F2] px-3.5 py-2.5">
              <Lock className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-dark-ink">Full terms unlock after sign-up</span>
            </div>
          )}
        </div>
      )}

      <OfferAction
        deal={deal}
        canViewFullTerms={canViewFullTerms}
        premiumAccess={premiumAccess}
        onRedeem={onRedeem}
        onUnlock={onUnlock}
        onRetryAccess={onRetryAccess}
        isLoading={isLoading}
        loggedOutLabel={featured ? "Start 30 days free to unlock this offer" : "Unlock this offer"}
      />
    </div>
  )

  // ---- Featured voucher-style card (first offer) ----
  if (featured) {
    return (
      <Card
        className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] border border-primary/15 animate-in slide-in-from-bottom duration-500"
        style={style}
      >
        {/* Voucher header — warm, soft accents, no solid red block */}
        <div className="relative px-6 pt-5 pb-5 bg-gradient-to-br from-[#FFF6F2] to-white border-b border-dashed border-primary/20">
          <div className="flex items-start justify-between gap-3 mb-3">
            <Badge className="bg-primary/10 text-primary border-0 text-[11px] font-semibold tracking-wide px-2.5 py-1">
              <Sparkles className="h-3 w-3 mr-1" aria-hidden="true" />
              Featured offer
            </Badge>
            <span className="inline-flex items-center text-xs font-medium text-dark-ink/70">
              <MapPin className="h-3.5 w-3.5 mr-1 text-primary" aria-hidden="true" />
              {offerLocation}
            </span>
          </div>
          <h3
            className="text-2xl font-bold text-dark-ink leading-tight text-balance"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {deal.offerTitle}
          </h3>
          <p className="mt-1.5 text-sm text-dark-ink/60">Available with your Eatinout membership</p>
        </div>
        <div className="p-6">{detailsBlock}</div>
      </Card>
    )
  }

  // ---- Compact, expandable secondary offer card ----
  const validitySummary = deal.validDays?.trim() ? deal.validDays.trim() : null

  return (
    <Card
      className="overflow-hidden rounded-2xl bg-white shadow-sm border border-lines animate-in slide-in-from-bottom duration-500"
      style={style}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-3 p-4 text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex-shrink-0 inline-flex items-center bg-primary/10 text-primary px-3 py-1.5 rounded-full font-bold text-sm">
            {deal.offerTitle}
          </span>
          {validitySummary && (
            <span className="truncate text-xs text-dark-ink/60">{validitySummary}</span>
          )}
        </div>
        <span className="flex items-center gap-1 flex-shrink-0 text-sm font-medium text-primary">
          {expanded ? "Hide" : "View details"}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </span>
      </button>

      {expanded && <div className="px-4 pb-5 pt-1">{detailsBlock}</div>}
    </Card>
  )
}
