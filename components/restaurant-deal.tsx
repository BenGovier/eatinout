import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, Clock, CalendarDays, ChevronRight, ChevronDown, Lock, Sparkles } from "lucide-react"
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
}

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function parseValidDays(validDaysStr: string): string[] {
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
                const isToday = day === today; // compare current day with today

                return (
                  <div
                    key={day}
                    className={`snap-start flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      isToday
                        ? "border-primary bg-primary text-white shadow-[0_2px_6px_rgba(227,30,36,0.25)]"
                        : "border-lines bg-white text-dark-ink"
                    }`}
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

      <Button
        onClick={() => onRedeem(deal.id, deal.restaurantId || "")}
        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 text-base rounded-lg shadow-[0_4px_14px_rgba(227,30,36,0.25)] focus:ring-2 focus:ring-primary focus:ring-offset-2"
        disabled={isLoading === deal.id}
      >
        {isLoading === deal.id
          ? "Adding..."
          : !canViewFullTerms
            ? (featured ? "Start 30 days free to unlock this offer" : "Unlock this offer")
            : "Add to wallet"}
      </Button>
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
