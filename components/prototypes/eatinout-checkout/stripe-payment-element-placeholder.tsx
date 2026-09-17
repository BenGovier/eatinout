import { CreditCard } from "lucide-react"

/**
 * PROTOTYPE PLACEHOLDER — not a real card form.
 *
 * DEV INTEGRATION POINT:
 * The actual Stripe PaymentElement will mount here.
 * Stripe will own and secure all sensitive payment fields.
 *
 * The "fields" below are non-interactive styled divs used only to communicate
 * layout, spacing and dimensions. They are NOT inputs. No payment data is
 * collected, entered, stored or processed.
 */

function MockField({
  label,
  placeholder,
  className = "",
  children,
}: {
  label: string
  placeholder?: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={className}>
      <span className="mb-1.5 block text-xs font-medium text-[var(--eo-muted)]">{label}</span>
      <div
        aria-hidden="true"
        className="flex h-11 items-center justify-between rounded-lg border border-black/10 bg-white px-3 text-sm text-[var(--eo-muted)]/70"
      >
        <span>{placeholder}</span>
        {children}
      </div>
    </div>
  )
}

export function StripePaymentElementPlaceholder() {
  return (
    <section aria-label="Card payment fields (prototype placeholder)" className="space-y-3">
      <MockField label="Card number" placeholder="1234 1234 1234 1234">
        <CreditCard className="h-4 w-4 text-[var(--eo-muted)]/60" aria-hidden="true" />
      </MockField>

      <div className="grid grid-cols-2 gap-3">
        <MockField label="Expiry" placeholder="MM / YY" />
        <MockField label="CVC" placeholder="123" />
      </div>

      <MockField label="Country" placeholder="United Kingdom" />

      {/*
        DEV INTEGRATION POINT:
        Replace this region with Stripe PaymentElement. Stripe owns and secures
        all sensitive card fields — no card data is collected here.
      */}
    </section>
  )
}
