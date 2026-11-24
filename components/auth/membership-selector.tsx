"use client"

import { Check } from "lucide-react"

export type MembershipPlan = "premium" | "free"

export type BillingOption = {
  priceId: string
  label: string
  price: string
  monthlyEquivalent?: string
  saving?: string
}

type MembershipSelectorProps = {
  value: MembershipPlan
  onChange: (plan: MembershipPlan) => void
  billingOptions: BillingOption[]
  selectedPriceId: string | null
  onPriceChange: (priceId: string) => void
  premiumSummary: string
  disabled?: boolean
}

const PREMIUM_BENEFITS = ["Up to 50% off", "Local restaurant offers", "Exclusive discounts", "Member giveaways"]

export function MembershipSelector({
  value,
  onChange,
  billingOptions,
  selectedPriceId,
  onPriceChange,
  premiumSummary,
  disabled,
}: MembershipSelectorProps) {
  const isPremium = value === "premium"

  return (
    <fieldset className="flex flex-col gap-2.5" disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold text-[#1A1A1A]">Choose your membership</legend>

      <div
        className={`overflow-hidden rounded-2xl border-2 transition-all ${
          isPremium
            ? "border-[#EB221C] bg-[#FFF5F3] shadow-lg shadow-[#EB221C]/10"
            : "border-[#EB221C]/35 bg-white hover:border-[#EB221C]/60"
        }`}
      >
        <label
          htmlFor="plan-premium"
          className="flex cursor-pointer items-start gap-3 px-4 py-3.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-[#EB221C]/40"
        >
          <input
            type="radio"
            id="plan-premium"
            name="membership"
            className="sr-only"
            checked={isPremium}
            onChange={() => onChange("premium")}
            aria-describedby="plan-premium-description"
          />
          <span className="pt-1">
            <RadioDot checked={isPremium} accent="#EB221C" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#B3150F]">Premium membership</span>
              <span className="shrink-0 rounded-full bg-[#EB221C] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                30 days free
              </span>
            </span>
            <span id="plan-premium-description" className="flex flex-col gap-2">
              <span className="text-pretty text-[17px] font-bold leading-snug text-[#1A1A1A]">
                Exclusive savings at local restaurants
              </span>
              <span role="list" className="grid grid-cols-2 gap-x-3 gap-y-1">
                {PREMIUM_BENEFITS.map((benefit) => (
                  <span key={benefit} role="listitem" className="flex items-start gap-1.5 text-[13px] leading-snug text-[#3A3A3A]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EB221C]" strokeWidth={3} aria-hidden="true" />
                    {benefit}
                  </span>
                ))}
              </span>
              <span className="text-[13px] font-semibold leading-snug text-[#1A1A1A]">
                {"Free for 30 days. "}
                <span className="font-medium text-[#5C5650]">{premiumSummary}</span>
              </span>
            </span>
          </span>
        </label>
        {isPremium && billingOptions.length > 1 && (
          <BillingChoices options={billingOptions} selectedPriceId={selectedPriceId} onSelect={onPriceChange} />
        )}
      </div>

      <label
        htmlFor="plan-free"
        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#1A1A1A]/30 ${
          value === "free" ? "border-[#1A1A1A] bg-white" : "border-[#E6DCCF] bg-white/70 hover:border-[#D9C7B4]"
        }`}
      >
        <input
          type="radio"
          id="plan-free"
          name="membership"
          className="sr-only"
          checked={value === "free"}
          onChange={() => onChange("free")}
          aria-describedby="plan-free-description"
        />
        <RadioDot checked={value === "free"} accent="#1A1A1A" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-[#1A1A1A]">Free account</span>
            <span className="shrink-0 text-sm font-bold text-[#1A1A1A]">£0</span>
          </span>
          <span id="plan-free-description" className="text-xs leading-snug text-[#5C5650]">
            Access national brand offers. No subscription needed.
          </span>
        </span>
      </label>
    </fieldset>
  )
}

function BillingChoices({
  options,
  selectedPriceId,
  onSelect,
}: {
  options: BillingOption[]
  selectedPriceId: string | null
  onSelect: (priceId: string) => void
}) {
  return (
    <fieldset className="flex flex-col gap-1.5 border-t border-[#EB221C]/15 px-3 pb-3 pt-2.5">
      <legend className="sr-only">Billing after your free trial</legend>
      <p className="text-xs font-semibold text-[#5C5650]" aria-hidden="true">
        Billing after your free trial
      </p>
      {options.map((option) => {
        const checked = option.priceId === selectedPriceId
        const inputId = `billing-${option.priceId}`
        return (
          <label
            key={option.priceId}
            htmlFor={inputId}
            className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border bg-white px-3 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#EB221C]/40 ${
              checked ? "border-[#EB221C]" : "border-[#E6DCCF] hover:border-[#D9C7B4]"
            }`}
          >
            <input
              type="radio"
              id={inputId}
              name="billing-period"
              className="sr-only"
              checked={checked}
              onChange={() => onSelect(option.priceId)}
            />
            <RadioDot checked={checked} small />
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-semibold text-[#1A1A1A]">{option.label}</span>
              {option.saving && (
                <span className="rounded-full bg-[#FDECEB] px-1.5 py-0.5 text-[11px] font-semibold text-[#B3150F]">
                  {option.saving}
                </span>
              )}
            </span>
            <span className="shrink-0 text-right text-xs font-semibold text-[#1A1A1A]">{option.price}</span>
          </label>
        )
      })}
    </fieldset>
  )
}

function RadioDot({ checked, accent = "#EB221C", small }: { checked: boolean; accent?: string; small?: boolean }) {
  const outer = small ? "h-4 w-4" : "h-5 w-5"
  const inner = small ? "h-2 w-2" : "h-2.5 w-2.5"
  return (
    <span
      aria-hidden="true"
      className={`flex ${outer} shrink-0 items-center justify-center rounded-full border-2`}
      style={{ borderColor: checked ? accent : "#BDB3A8" }}
    >
      {checked && <span className={`${inner} rounded-full`} style={{ backgroundColor: accent }} />}
    </span>
  )
}
