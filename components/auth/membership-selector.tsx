"use client"

import type React from "react"

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
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold text-[#1A1A1A]">Choose your membership</legend>

      <MembershipOption
        id="plan-premium"
        checked={isPremium}
        onSelect={() => onChange("premium")}
        featured
        title="Premium membership"
        tag="30 days free"
        tagLabel="30-day free trial"
        description="Local restaurant discounts and exclusive offers"
        footnote={premiumSummary}
        extra={
          isPremium && billingOptions.length > 1 ? (
            <BillingChoices options={billingOptions} selectedPriceId={selectedPriceId} onSelect={onPriceChange} />
          ) : null
        }
      />

      <MembershipOption
        id="plan-free"
        checked={value === "free"}
        onSelect={() => onChange("free")}
        title="Free account"
        tag="£0"
        tagLabel="Free"
        description="Access national brand offers without a subscription"
      />
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

type MembershipOptionProps = {
  id: string
  checked: boolean
  onSelect: () => void
  featured?: boolean
  title: string
  tag: string
  tagLabel: string
  description: string
  footnote?: string
  extra?: React.ReactNode
}

function MembershipOption({
  id,
  checked,
  onSelect,
  featured,
  title,
  tag,
  tagLabel,
  description,
  footnote,
  extra,
}: MembershipOptionProps) {
  const descriptionId = `${id}-description`

  return (
    <div
      className={`overflow-hidden rounded-xl border-2 transition-colors ${
        checked
          ? featured
            ? "border-[#EB221C] bg-[#FFF5F3]"
            : "border-[#1A1A1A] bg-white"
          : "border-[#E6DCCF] bg-white hover:border-[#D9C7B4]"
      }`}
    >
      <label
        htmlFor={id}
        className="flex cursor-pointer items-start gap-3 px-3.5 py-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-[#EB221C]/40"
      >
        <input
          type="radio"
          id={id}
          name="membership"
          className="sr-only"
          checked={checked}
          onChange={onSelect}
          aria-describedby={descriptionId}
        />
        <span className="pt-0.5">
          <RadioDot checked={checked} accent={featured ? "#EB221C" : "#1A1A1A"} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-bold leading-tight text-[#1A1A1A]">{title}</span>
            <span
              aria-label={tagLabel}
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                featured ? "bg-[#EB221C] text-white" : "bg-[#F1EBE3] text-[#1A1A1A]"
              }`}
            >
              {tag}
            </span>
          </span>
          <span id={descriptionId} className="flex flex-col gap-0.5">
            <span className="text-[13px] leading-snug text-[#3A3A3A]">{description}</span>
            {footnote && <span className="text-xs font-medium leading-snug text-[#5C5650]">{footnote}</span>}
          </span>
        </span>
      </label>
      {extra}
    </div>
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
