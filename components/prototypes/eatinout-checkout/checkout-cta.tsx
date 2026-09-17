"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"

/**
 * PROTOTYPE CTA — intentionally inert.
 *
 * This button must NOT call an API, create a subscription, create a Stripe
 * session, save card information, alter user state or navigate into the live
 * checkout. It only shows a harmless local prototype message.
 *
 * Colours come from the prototype-scoped `--p-*` custom properties set on the
 * prototype root; this component touches no global tokens.
 */
export function CheckoutCTA() {
  const [notice, setNotice] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setNotice(true)}
        style={{ boxShadow: "0 12px 28px rgba(217,4,41,0.20)", letterSpacing: "-0.01em" }}
        className="group flex h-[58px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--p-red)] px-6 text-[17px] font-extrabold text-white transition-all duration-150 hover:bg-[var(--p-red-hover)] motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--p-red)]"
      >
        Start saving &mdash; £0 today
        <ArrowRight
          className="h-5 w-5 text-white/90 transition-transform duration-150 motion-safe:group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </button>

      <p className="mt-3 text-center text-xs">
        <span className="font-bold text-[var(--p-ink)]">30 days free</span>
        <span className="text-[var(--p-sep)]"> &bull; </span>
        <span className="text-[var(--p-body)]">Then £4.99/month</span>
        <span className="text-[var(--p-sep)]"> &bull; </span>
        <span className="text-[var(--p-sage)]" style={{ fontWeight: 650 }}>Cancel anytime</span>
      </p>

      {notice && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-dashed border-[var(--p-red)]/40 bg-[var(--p-red)]/5 px-3 py-2 text-center text-sm font-medium text-[var(--p-red)]"
        >
          Prototype only &mdash; Stripe integration not connected.
        </p>
      )}
    </div>
  )
}
