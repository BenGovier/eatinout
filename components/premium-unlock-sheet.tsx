"use client"

import { Check, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"

const PREMIUM_BENEFITS = [
  "Exclusive discounts at local independent restaurants",
  "Add offers to your wallet and redeem them in seconds",
  "New restaurants and offers added every week",
  "Manage or cancel your membership at any time",
]

interface PremiumUnlockSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  offerTitle?: string
  restaurantName?: string
  onStartPremium: () => void
}

export function PremiumUnlockSheet({
  open,
  onOpenChange,
  offerTitle,
  restaurantName,
  onStartPremium,
}: PremiumUnlockSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-lines bg-white p-0"
      >
        <div className="mx-auto w-full max-w-lg px-6 pb-8 pt-3">
          <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200" aria-hidden="true" />

          <div className="flex flex-col items-center text-center">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" aria-hidden="true" />
            </span>
            <SheetTitle
              className="text-2xl font-bold leading-tight text-dark-ink text-balance"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Unlock this offer with Premium
            </SheetTitle>
            <SheetDescription className="mt-2 text-sm leading-relaxed text-dark-ink/70 text-pretty">
              {offerTitle
                ? `"${offerTitle}"${restaurantName ? ` at ${restaurantName}` : ""} is for Eatinout Premium members.`
                : "This offer is for Eatinout Premium members."}
            </SheetDescription>
          </div>

          {offerTitle && (
            <div className="mt-5 rounded-2xl border border-dashed border-primary/25 bg-[#FFF6F2] px-4 py-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Premium offer</p>
              <p className="mt-0.5 font-bold text-dark-ink">{offerTitle}</p>
            </div>
          )}

          <ul className="mt-6 flex flex-col gap-3">
            {PREMIUM_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                </span>
                <span className="text-sm leading-relaxed text-dark-ink/90">{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col gap-2">
            <Button
              type="button"
              onClick={onStartPremium}
              className="w-full rounded-lg bg-primary py-3 text-base font-bold text-white shadow-[0_4px_14px_rgba(227,30,36,0.25)] hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Start Premium
            </Button>
            <SheetClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-lg py-3 text-base font-medium text-dark-ink/70 hover:bg-soft-bg hover:text-dark-ink"
              >
                Not now
              </Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
