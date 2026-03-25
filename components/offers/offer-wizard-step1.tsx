"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react"

interface Restaurant {
  _id: string
  name: string
}

interface OfferWizardStep1Props {
  restaurantId: string
  offerType: "" | "discount" | "bogo" | "freeItem" | "other"
  discountPercentage: string
  freeItemName: string
  otherOfferDescription: string
  restaurants: Restaurant[]
  hasActiveSubscription?: boolean
  onRestaurantChange: (value: string) => void
  onOfferTypeChange: (value: string) => void
  onDiscountChange: (value: string) => void
  onFreeItemChange: (value: string) => void
  onOtherOfferDescriptionChange: (value: string) => void
  onUpgradeToPaid?: () => void
}

export function OfferWizardStep1({
  restaurantId,
  offerType,
  discountPercentage,
  freeItemName,
  otherOfferDescription,
  restaurants,
  hasActiveSubscription = false,
  onRestaurantChange,
  onOfferTypeChange,
  onDiscountChange,
  onFreeItemChange,
  onOtherOfferDescriptionChange,
  onUpgradeToPaid,
}: OfferWizardStep1Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="restaurant">Restaurant *</Label>
        <Select value={restaurantId} onValueChange={onRestaurantChange}>
          <SelectTrigger id="restaurant" className="w-full">
            <SelectValue placeholder="Select your restaurant" />
          </SelectTrigger>
          <SelectContent>
            {restaurants.map((restaurant) => (
              <SelectItem key={restaurant._id} value={restaurant._id}>
                {restaurant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Choose Your Offer Type</h3>
        <RadioGroup value={offerType} onValueChange={onOfferTypeChange}>
          <div className="space-y-3">
            <label
              htmlFor="discount"
              className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors ${offerType === "discount"
                ? "border-[#E31E24] bg-red-50"
                : "border-border hover:border-[#E31E24]/50"
                }`}
            >
              <RadioGroupItem value="discount" id="discount" className="mt-1" />
              <div className="flex-1">
                <div className="mb-1 font-semibold">Percentage Discount</div>
                <p className="text-sm text-muted-foreground">
                  Minimum 25% off the total bill or specific items
                </p>
              </div>
            </label>

            <label
              htmlFor="bogo"
              className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors ${offerType === "bogo"
                ? "border-[#E31E24] bg-red-50"
                : "border-border hover:border-[#E31E24]/50"
                }`}
            >
              <RadioGroupItem value="bogo" id="bogo" className="mt-1" />
              <div className="flex-1">
                <div className="mb-1 font-semibold">2 for 1</div>
                <p className="text-sm text-muted-foreground">
                  Customer buys one item and gets another free
                </p>
              </div>
            </label>

            <label
              htmlFor="freeItem"
              className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors ${offerType === "freeItem"
                ? "border-[#E31E24] bg-red-50"
                : "border-border hover:border-[#E31E24]/50"
                }`}
            >
              <RadioGroupItem value="freeItem" id="freeItem" className="mt-1" />
              <div className="flex-1">
                <div className="mb-1 font-semibold">Free Item</div>
                <p className="text-sm text-muted-foreground">
                  Offer a specific item for free
                </p>
              </div>
            </label>

            <label
              htmlFor="other"
              className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors ${offerType === "other"
                ? "border-[#E31E24] bg-red-50"
                : "border-border hover:border-[#E31E24]/50"
                }`}
            >
              <RadioGroupItem value="other" id="other" className="mt-1" />
              <div className="flex-1">
                <div className="mb-1 font-semibold">Other</div>
                <p className="text-sm text-muted-foreground">
                  Create a custom offer
                </p>
              </div>
            </label>
          </div>
        </RadioGroup>
      </div>

      {offerType === "discount" && (
        <div className="space-y-2">
          <Label htmlFor="discount-amount">Discount Percentage *</Label>
          <div className="relative">
            <Input
              id="discount-amount"
              type="number"
              min={hasActiveSubscription ? "1" : "1"}
              max="100"
              value={discountPercentage}
              onChange={(e) => onDiscountChange(e.target.value)}
              placeholder="e.g., 25, 30, 50"
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
          {!hasActiveSubscription && discountPercentage && Number(discountPercentage) < 25 && (
            <Alert className="border-amber-500 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Please note, offers less than 25%, Buy One Get One Free need to be a premium membership.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
{/* 
      {offerType === "freeItem" && (
        <div className="space-y-2">
          <Label htmlFor="free-item-name">Free Item Name *</Label>
          <Input
            id="free-item-name"
            type="text"
            value={freeItemName}
            onChange={(e) => onFreeItemChange(e.target.value)}
            placeholder="e.g., Apple, Mango, Coffee"
          />
        </div>
      )} */}

      {offerType === "other" && (
        <div className="space-y-2">
          <Label htmlFor="other-offer-description">Custom Offer Description *</Label>
          <Input
            id="other-offer-description"
            type="text"
            value={otherOfferDescription}
            onChange={(e) => onOtherOfferDescriptionChange(e.target.value)}
            placeholder="Describe your custom offer"
          />
        </div>
      )}

      {!hasActiveSubscription &&
        offerType === "discount" &&
        discountPercentage &&
        Number(discountPercentage) < 25 &&
        onUpgradeToPaid && (
          <Alert className="border-[#E31E24] bg-red-50">
            <Sparkles className="h-4 w-4 text-[#E31E24]" />
            <AlertDescription className="space-y-2">
              <p className="font-semibold text-foreground">Upgrade to Premium to create this offer</p>
              <Button
                onClick={onUpgradeToPaid}
                className="w-full bg-[#E31E24] hover:bg-[#C01A1F]"
                size="sm"
              >
                Upgrade to Premium
              </Button>
              <p className="text-xs text-muted-foreground">Cancel anytime</p>
            </AlertDescription>
          </Alert>
        )}
    </div>
  )
}