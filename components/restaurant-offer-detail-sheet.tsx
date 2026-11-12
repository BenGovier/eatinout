"use client"

import type { ReactNode } from "react"
import { CalendarDays, Clock, FileText, Lock, Phone } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useIsMobile } from "@/components/ui/use-mobile"
import { useAuth } from "@/context/auth-context"
import { OfferAction, parseValidDays, type OfferDeal, type PremiumAccessState } from "@/components/restaurant-deal"

interface RestaurantOfferDetailSheetProps {
  deal: OfferDeal | null
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantName?: string
  phoneNumber: string
  premiumAccess?: PremiumAccessState
  onRedeem: (offerId: string, associatedId: string) => void
  onUnlock?: (offerId: string) => void
  onRetryAccess?: () => void
  isLoading: string | null
}

function DetailRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-4">
      <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-dark-ink/55">{label}</p>
        <div className="mt-1 text-sm leading-relaxed text-dark-ink">{children}</div>
      </div>
    </div>
  )
}

function BookingText({ requirement, phoneNumber }: { requirement: string; phoneNumber: string }) {
  const phoneLink = (
    <a href={`tel:${phoneNumber}`} className="font-semibold text-primary underline-offset-2 hover:underline">
      {phoneNumber}
    </a>
  )
  if (requirement === "mandatory") return <p>Booking is required for this offer. Call {phoneLink}</p>
  if (requirement === "recommended") return <p>Booking is recommended but not always essential. Call {phoneLink}</p>
  if (requirement === "notNeeded") return <p>No need to book or call ahead.</p>
  return <p>Call {phoneLink} for booking details.</p>
}

export function RestaurantOfferDetailSheet({
  deal,
  open,
  onOpenChange,
  restaurantName,
  phoneNumber,
  premiumAccess,
  onRedeem,
  onUnlock,
  onRetryAccess,
  isLoading,
}: RestaurantOfferDetailSheetProps) {
  const isMobile = useIsMobile()
  const { isAuthenticated, user } = useAuth()
  const canViewFullTerms = isAuthenticated && user?.role === "user"

  if (!deal) return null

  const days = deal.validDays?.trim() ? parseValidDays(deal.validDays) : []
  const termsLines = typeof deal.terms === "string" ? deal.terms.split("\n").filter((line) => line.trim()) : []
  const Title = isMobile ? SheetTitle : DialogTitle
  const Description = isMobile ? SheetDescription : DialogDescription

  const content = (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-3 md:px-6 md:pt-6">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 md:hidden" aria-hidden="true" />

        <div className="pr-8">
          {restaurantName && (
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{restaurantName}</p>
          )}
          <Title
            className="mt-1 text-2xl font-bold leading-tight text-dark-ink text-balance"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {deal.offerTitle}
          </Title>
        </div>

        {deal.description ? (
          <Description className="mt-3 text-base leading-relaxed text-dark-ink/80 text-pretty">
            {deal.description}
          </Description>
        ) : (
          <Description className="sr-only">Offer details for {deal.offerTitle}</Description>
        )}

        <div className="mt-2 divide-y divide-lines/70">
          {days.length > 0 && (
            <DetailRow icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />} label="Available">
              {days.length === 7 ? (
                <p>Every day</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5" aria-label="Available days">
                  {days.map((day) => (
                    <li
                      key={day}
                      className="rounded-full bg-soft-bg px-2.5 py-1 text-xs font-semibold text-dark-ink"
                    >
                      {day}
                    </li>
                  ))}
                </ul>
              )}
            </DetailRow>
          )}

          {deal.validHours && (
            <DetailRow icon={<Clock className="h-4 w-4" aria-hidden="true" />} label="Times">
              <p>{deal.validHours}</p>
            </DetailRow>
          )}

          <DetailRow icon={<Phone className="h-4 w-4" aria-hidden="true" />} label="Before you visit">
            <BookingText requirement={deal.bookingRequirement} phoneNumber={phoneNumber} />
          </DetailRow>

          {termsLines.length > 0 && (
            <DetailRow icon={<FileText className="h-4 w-4" aria-hidden="true" />} label="Terms and restrictions">
              {canViewFullTerms ? (
                <ul className="flex flex-col gap-1.5 text-dark-ink/80">
                  {termsLines.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="inline-flex items-center gap-1.5 font-medium">
                  <Lock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Full terms unlock after sign-up
                </p>
              )}
            </DetailRow>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-lines bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6">
        <OfferAction
          deal={deal}
          canViewFullTerms={canViewFullTerms}
          premiumAccess={premiumAccess}
          onRedeem={onRedeem}
          onUnlock={onUnlock}
          onRetryAccess={onRetryAccess}
          isLoading={isLoading}
        />
      </div>
    </>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-t-3xl border-t border-lines bg-white p-0"
        >
          {content}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-2xl border-lines bg-white p-0 sm:max-w-lg sm:rounded-2xl">
        {content}
      </DialogContent>
    </Dialog>
  )
}
