"use client"

import { BadgeCheck, Store } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { normalizeOfferClassification, type OfferClassification } from "@/lib/offer-classification"

export function OfferClassificationBadge({ classification }: { classification: unknown }) {
  const isExisting = normalizeOfferClassification(classification) === "existing"
  const Icon = isExisting ? Store : BadgeCheck
  return (
    <span
      className={
        isExisting
          ? "inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs font-medium text-gray-700"
          : "inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
      }
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {isExisting ? "Existing" : "Exclusive"}
    </span>
  )
}

interface OfferClassificationSelectorProps {
  value: OfferClassification
  onChange: (value: OfferClassification) => void
  disabledExisting?: boolean
  disabledExistingReason?: string
  idPrefix?: string
}

const OPTIONS: {
  value: OfferClassification
  title: string
  description: string
  Icon: typeof BadgeCheck
}[] = [
  {
    value: "exclusive",
    title: "EatinOut Exclusive",
    description: "A special member offer. Customers claim a voucher and reveal their code at the restaurant.",
    Icon: BadgeCheck,
  },
  {
    value: "existing",
    title: "Existing Restaurant Offer",
    description:
      "A promotion already available at the restaurant. Customers can save its details without a voucher code.",
    Icon: Store,
  },
]

export function OfferClassificationSelector({
  value,
  onChange,
  disabledExisting = false,
  disabledExistingReason,
  idPrefix = "offer-classification",
}: OfferClassificationSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-lg font-semibold">What kind of offer is this?</legend>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as OfferClassification)}
        className="grid gap-3 sm:grid-cols-2"
      >
        {OPTIONS.map(({ value: optionValue, title, description, Icon }) => {
          const selected = value === optionValue
          const disabled = optionValue === "existing" && disabledExisting && value !== "existing"
          const id = `${idPrefix}-${optionValue}`
          return (
            <label
              key={optionValue}
              htmlFor={id}
              className={`flex items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              } ${
                selected ? "border-[#E31E24] bg-red-50" : "border-border hover:border-[#E31E24]/50"
              }`}
            >
              <RadioGroupItem value={optionValue} id={id} disabled={disabled} className="mt-1" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${selected ? "text-[#E31E24]" : "text-muted-foreground"}`}
                    aria-hidden="true"
                  />
                  {title}
                </div>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </label>
          )
        })}
      </RadioGroup>
      {disabledExisting && value !== "existing" && disabledExistingReason && (
        <p className="text-xs text-muted-foreground">{disabledExistingReason}</p>
      )}
    </fieldset>
  )
}
