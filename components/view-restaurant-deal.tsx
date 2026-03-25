import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, Clock, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"

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

interface ViewRestaurantDealProps {
  deal: Deal
  phoneNumber: string
  membersUsed: number
  onRedeem: (offerId: string, associatedId: string) => void
  isLoading: string | null
  style?: React.CSSProperties
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

export function ViewRestaurantDeal({ deal, phoneNumber, membersUsed, onRedeem, isLoading, style }: ViewRestaurantDealProps) {
  const [showScrollArrow, setShowScrollArrow] = useState(true)
  const today = weekDays[new Date().getDay()]
  const validDaysArray = parseValidDays(deal.validDays)
  const offerLocation = deal.location.split(",")[0].trim()
  // const termsLines = deal.terms ? deal.terms.split("\n").filter((line) => line.trim()) : []
  const termsLines =
  typeof deal.terms === "string"
    ? deal.terms.split("\n").filter((line) => line.trim())
    : [];

  useEffect(() => {
    const timer = setTimeout(() => setShowScrollArrow(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Card
      className="overflow-hidden rounded-2xl shadow-md border-lines animate-in slide-in-from-bottom duration-500"
      style={style}
    >
      <div className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          {/* <h3
            className="text-xl font-bold text-dark-ink"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {deal.offerTitle}
          </h3> */}
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex items-center gap-2 animate-in zoom-in duration-300"
              style={{ animationDelay: "200ms" }}
            >
              <div className="bg-primary text-white px-4 py-2 rounded-full font-bold text-xl shadow-[0_4px_12px_rgba(227,30,36,0.3)]">
                {deal.offerTitle}
              </div>
              {/* {offer.discountValue >= 40 && (
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                  <div className="relative bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-bold">
                    HOT
                  </div>
                </div>
              )} */}
            </div>
          </div>
          <Badge className="bg-[#F1F5F9] text-[#475569] border-0 text-xs">
            <MapPin className="h-3 w-3 mr-1" aria-hidden="true" />
            {offerLocation}
          </Badge>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-dark-ink mb-1">Description</h4>
          <p className="text-dark-ink text-base">{deal.description}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-dark-ink mb-2">Valid Days</p>
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-thin scrollbar-thumb-lines scrollbar-track-transparent pb-2 md:overflow-visible">
              {validDaysArray.map((day) => {
                const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                const todayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
                const today = weekDays[(todayIndex + 6) % 7]; // shift so Sunday=0 → "Sun"
                const isToday = day === today; // compare current day with today

                return (
                  <div
                    key={day}
                    className={`snap-start flex-shrink-0 px-3 py-1.5 rounded-2xl text-xs font-medium border-2 border-[#00B894] text-[#00B894] bg-[#00B894]/5 ${isToday ? "ring-2 ring-[#00B894]/30 ring-offset-2" : ""}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {showScrollArrow && validDaysArray.length > 3 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 animate-bounce md:hidden">
                <ChevronRight className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-dark-ink">
          <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium">{deal.validHours}</span>
        </div>


        <div className="flex items-center gap-2 text-dark-ink">
          <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
          {deal.bookingRequirement === "mandatory" && (
            <p className="text-sm">
              You are required to book ahead for this deal, call{" "}
              <a href={`tel:${phoneNumber}`} className="font-semibold text-primary">
                {phoneNumber}
              </a>
            </p>
          )}
          {deal.bookingRequirement === "recommended" && (
            <p className="text-sm">
              It’s recommended you book but not always essential call{" "}
              <a href={`tel:${phoneNumber}`} className="font-semibold text-primary">
                {phoneNumber}
              </a>
            </p>
          )}
          {deal.bookingRequirement === "notNeeded" && (
            <p className="text-sm">
              You do not need to call ahead or book
            </p>
          )}
        </div>

        {termsLines.length > 0 && (
          <div className="pt-4 border-t border-lines">
            <h4 className="text-sm font-semibold text-dark-ink mb-2">Terms of the deal</h4>
            <div className="text-xs text-[#475569] leading-relaxed space-y-2">
              {termsLines.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}
        <Button
          onClick={() => onRedeem(deal.id, deal.associatedId)}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 text-base focus:ring-2 focus:ring-primary focus:ring-offset-2"
          disabled={isLoading === deal.id}
        >
          {isLoading === deal.id ? "Adding..." : "Add to Wallet"}
        </Button>
      </div>
    </Card>
  )
}