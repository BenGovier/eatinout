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

const PREMIUM_FEATURES = ["500+ restaurants", "2,000+ offers", "Save up to 50%", "Member giveaways"]

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
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="mb-3 text-lg font-bold text-[#1A1A1A]">Choose how you save</legend>

      <MembershipOption
        id="plan-premium"
        checked={isPremium}
        onSelect={() => onChange("premium")}
        title="Premium membership"
        badge="30 days free"
        badgeLabel="30-day free trial"
        extra={
          isPremium && billingOptions.length > 1 ? (
            <BillingChoices options={billingOptions} selectedPriceId={selectedPriceId} onSelect={onPriceChange} />
          ) : null
        }
      >
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#2B2B2B]">
          {PREMIUM_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-1.5">
              <Check className="h-4 w-4 shrink-0 text-[#1F5A3A]" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-[#3A3A3A]">{premiumSummary}</p>
      </MembershipOption>

      <MembershipOption
        id="plan-free"
        checked={value === "free"}
        onSelect={() => onChange("free")}
        title="Free account"
        badge="£0"
        badgeLabel="Free"
      >
        <p className="text-sm text-[#3A3A3A]">Big-brand deals as they launch. No subscription or card.</p>
      </MembershipOption>

      <p className="px-1 text-xs text-[#5C5650]">One account. You can upgrade anytime.</p>
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
    <fieldset className="flex flex-col gap-2 border-t border-[#1F5A3A]/20 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
      <legend className="sr-only">Billing period</legend>
      <p className="text-sm font-semibold text-[#1A1A1A]" aria-hidden="true">
        Billing after your free trial
      </p>
      {options.map((option) => {
        const checked = option.priceId === selectedPriceId
        const inputId = `billing-${option.priceId}`
        return (
          <label
            key={option.priceId}
            htmlFor={inputId}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-3 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#1F5A3A] has-[:focus-visible]:ring-offset-1 ${
              checked ? "border-[#1F5A3A]" : "border-[#DDD6CE] hover:border-[#B9C9BD]"
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
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                checked ? "border-[#1F5A3A]" : "border-[#1F5A3A]/60"
              }`}
              aria-hidden="true"
            >
              {checked && <span className="h-2.5 w-2.5 rounded-full bg-[#1F5A3A]" />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-sm font-bold text-[#1A1A1A]">{option.label}</span>
                {option.saving && (
                  <span className="rounded-full bg-[#F8E7B0] px-2 py-0.5 text-[11px] font-bold text-[#1F4D2E]">
                    {option.saving}
                  </span>
                )}
              </span>
              {option.monthlyEquivalent && (
                <span className="text-xs text-[#5C5650]">{option.monthlyEquivalent}</span>
              )}
            </span>
            <span className="shrink-0 text-right text-sm font-semibold text-[#1A1A1A]">{option.price}</span>
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
  title: string
  badge: string
  badgeLabel: string
  children: React.ReactNode
  extra?: React.ReactNode
}

function MembershipOption({ id, checked, onSelect, title, badge, badgeLabel, children, extra }: MembershipOptionProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-colors ${
        checked ? "border-2 border-[#1F5A3A] bg-[#EAF4EC]" : "border-[#DDD6CE] bg-[#FFFCF9] hover:border-[#B9C9BD]"
      }`}
    >
      <label
        htmlFor={id}
        className="relative flex cursor-pointer items-stretch gap-3 rounded-2xl p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-[#1F5A3A] sm:gap-4 sm:p-5"
      >
        <input
          type="radio"
          id={id}
          name="membership"
          className="sr-only"
          checked={checked}
          onChange={onSelect}
        />
        <span className="flex items-center" aria-hidden="true">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
              checked ? "border-[#1F5A3A]" : "border-[#1F5A3A]/70"
            }`}
          >
            {checked && <span className="h-3 w-3 rounded-full bg-[#1F5A3A]" />}
          </span>
        </span>
        <span className="w-px self-stretch bg-[#1F5A3A]/40" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex items-start justify-between gap-2">
            <span className="text-base font-bold text-[#1A1A1A] sm:text-lg">{title}</span>
            <span
              className="shrink-0 rounded-full bg-[#F8E7B0] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[#1F4D2E]"
              aria-label={badgeLabel}
            >
              {badge}
            </span>
          </span>
          {children}
        </span>
      </label>
      {extra}
    </div>
  )
}
