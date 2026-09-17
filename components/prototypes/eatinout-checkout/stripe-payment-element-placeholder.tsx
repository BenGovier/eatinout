import { CreditCard } from "lucide-react"

/**
 * PROTOTYPE PLACEHOLDER — not a real card form.
 *
 * DEV INTEGRATION POINT:
 * The actual Stripe PaymentElement will mount here.
 * Stripe will own and secure all sensitive payment fields.
 *
 * The "fields" below are non-interactive styled divs used only to communicate
 * layout, spacing, dimensions and the intended focus treatment. They are NOT
 * inputs. No payment data is collected, entered, stored or processed.
 *
 * Colours come from the prototype-scoped `--p-*` custom properties on the
 * prototype root; this component touches no global tokens.
 */

function MockField({
  label,
  placeholder,
  className = "",
  focused = false,
  children,
}: {
  label: string
  placeholder?: string
  className?: string
  /** Statically shows the intended focus treatment (border + ring) for handoff. */
  focused?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className={className}>
      <span className="mb-1.5 block text-[13px] font-semibold text-[var(--p-muted-strong)]">{label}</span>
      <div
        aria-hidden="true"
        className="flex h-[52px] items-center justify-between rounded-xl px-3.5 text-sm text-[var(--p-muted)]/70 transition-all duration-150"
        style={
          focused
            ? {
                background: "var(--p-field)",
                border: "1px solid var(--p-red)",
                boxShadow: "0 0 0 3px rgba(217,4,41,0.08)",
              }
            : {
                background: "var(--p-field)",
                border: "1px solid rgba(22,23,26,0.10)",
              }
        }
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
      {/* First field shows the intended focus state so the design intent is visible. */}
      <MockField label="Card number" placeholder="1234 1234 1234 1234" focused>
        <CreditCard className="h-4 w-4 text-[var(--p-muted)]/60" aria-hidden="true" />
      </MockField>

      <div className="grid grid-cols-2 gap-3">
        <MockField label="Expiry" placeholder="MM / YY" />
        <MockField label="CVC" placeholder="123" />
      </div>

      <MockField label="Country" placeholder="United Kingdom" />
    </section>
  )
}
