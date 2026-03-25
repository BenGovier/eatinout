import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, Clock, ChevronRight } from "lucide-react"
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

export function RestaurantDeal({ deal, phoneNumber, membersUsed, onRedeem, isLoading, style }: RestaurantDealProps) {
  const [showScrollArrow, setShowScrollArrow] = useState(true)
  const validDaysArray = parseValidDays(deal.validDays)
  const offerLocation = deal.location.split(",")[0].trim()
  // const termsLines = deal.terms ? deal.terms.split("\n").filter((line) => line.trim()) : []
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

  return (
    <Card
      className="overflow-hidden rounded-2xl shadow-md border-lines animate-in slide-in-from-bottom duration-500"
      style={style}
    >
      <div className="p-6 space-y-5">
        <div className="flex flex-row lg:flex-row sm:flex-col max-sm:flex-col  items-start justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex items-center gap-2 animate-in zoom-in duration-300"
              style={{ animationDelay: "200ms" }}
            >
              <div className="bg-primary text-white px-4 py-2 rounded-full font-bold text-xl md:text-lg sm:text-base max-sm:text-sm shadow-[0_4px_12px_rgba(227,30,36,0.3)]">
                {deal.offerTitle}
              </div>
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
            <h4 className="text-sm font-semibold text-dark-ink mb-3">Terms & Conditions</h4>
            <div className="bg-[#f5e6e6] rounded-lg p-4 space-y-2 relative">
              {!canViewFullTerms && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                  <p className="text-sm font-medium text-dark-ink">Login or sign up to view full terms & conditions</p>
                </div>
              )}
              <div className={`text-sm text-[#475569] leading-relaxed space-y-2 ${!canViewFullTerms ? 'blur-sm select-none' : ''}`}>
                {termsLines.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        )}
        <Button
          onClick={() => onRedeem(deal.id, deal.associatedId)}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 text-base focus:ring-2 focus:ring-primary focus:ring-offset-2"
          disabled={isLoading === deal.id}
        >
          {isLoading === deal.id ? "Adding..." : !canViewFullTerms ? "Subscribe to get offer" : "Add to wallet"}
        </Button>
      </div>
    </Card>
  )
}