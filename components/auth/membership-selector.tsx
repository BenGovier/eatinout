"use client"

import { Check } from "lucide-react"

export type MembershipPlan = "premium" | "free"

type MembershipSelectorProps = {
  value: MembershipPlan
  onChange: (plan: MembershipPlan) => void
  showMonthlyPrice: boolean
  disabled?: boolean
}

const PREMIUM_FEATURES = ["500+ restaurants", "2,000+ offers", "Save up to 50%", "Member giveaways"]

export function MembershipSelector({ value, onChange, showMonthlyPrice, disabled }: MembershipSelectorProps) {
  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="mb-3 text-lg font-bold text-[#1A1A1A]">Choose how you save</legend>

      <MembershipOption
        id="plan-premium"
        checked={value === "premium"}
        onSelect={() => onChange("premium")}
        title="Premium membership"
        badge="30 days free"
        badgeLabel="30-day free trial"
      >
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#2B2B2B]">
          {PREMIUM_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-1.5">
              <Check className="h-4 w-4 shrink-0 text-[#1F5A3A]" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-[#3A3A3A]">
          {showMonthlyPrice ? "Then £4.99/month · Cancel anytime" : "Plan price confirmed at checkout · Cancel anytime"}
        </p>
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

type MembershipOptionProps = {
  id: string
  checked: boolean
  onSelect: () => void
  title: string
  badge: string
  badgeLabel: string
  children: React.ReactNode
}

function MembershipOption({ id, checked, onSelect, title, badge, badgeLabel, children }: MembershipOptionProps) {
  return (
    <label
      htmlFor={id}
      className={`relative flex cursor-pointer items-stretch gap-3 rounded-2xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#1F5A3A] has-[:focus-visible]:ring-offset-2 sm:gap-4 sm:p-5 ${
        checked ? "border-2 border-[#1F5A3A] bg-[#EAF4EC]" : "border-[#DDD6CE] bg-[#FFFCF9] hover:border-[#B9C9BD]"
      }`}
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
  )
}
