"use client"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

interface OfferWizardStep5Props {
  terms: string
  confirmed: boolean
  restaurantName: string
  offerType: "" | "discount" | "bogo" | "freeItem" | "other"
  discountPercentage: string
  freeItemName?: string
  otherOfferDescription?: string
  title: string
  onTermsChange: (value: string) => void
  onConfirmedChange: (checked: boolean) => void
  mode?: "create" | "edit" | "duplicate"
}

export function OfferWizardStep5({
  terms, confirmed, restaurantName, offerType, discountPercentage,
  freeItemName = "", otherOfferDescription = "",
  title, onTermsChange, onConfirmedChange, mode = "create",
}: OfferWizardStep5Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="terms">Terms & Conditions (One per line)</Label>
        <Textarea
          id="terms"
          value={terms}
          onChange={(e) => onTermsChange(e.target.value)}
          placeholder="Any restrictions or conditions for this offer&#10;Example: Valid for dine-in only, Not valid with other offers, etc."
          rows={4}
          className="max-h-32 overflow-y-auto resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Example: Valid for dine-in only, Not valid with other offers, etc.
        </p>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">
          {mode === "edit" ? "Review Your Changes" : "Review Your Exclusive Offer"}
        </h3>
        <div className="space-y-4 rounded-lg border border-border bg-muted/50 p-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Restaurant</p>
            <p className="font-semibold">{restaurantName || "Not selected"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Offer Type</p>
            <p className="font-semibold">
              {offerType === "bogo"
                ? "2 for 1"
                : offerType === "discount"
                  ? `${discountPercentage}% Discount`
                  : offerType === "freeItem"
                    ? `Free Item`
                    : offerType === "other"
                      ? `Custom: ${otherOfferDescription || "Not set"}`
                      : "Not selected"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Title</p>
            <p className="font-semibold">{title || "Not set"}</p>
          </div>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={confirmed} onCheckedChange={(checked) => onConfirmedChange(checked as boolean)} />
        <span className="text-sm">
          {mode === "edit"
            ? "I confirm the offer details are correct and I want to update this offer"
            // : "I confirm this offer is exclusive to EATINOUT and I commit to keeping it active for 12 months"
            : "By submitting an offer on Eatinout, you confirm that you are authorised by the restaurant or venue to publish this offer on its behalf."
          }
        </span>
      </label>
    </div>
  )
}

