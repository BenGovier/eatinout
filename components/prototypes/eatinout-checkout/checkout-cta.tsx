"use client"

import { useState } from "react"

/**
 * PROTOTYPE CTA — intentionally inert.
 *
 * This button must NOT call an API, create a subscription, create a Stripe
 * session, save card information, alter user state or navigate into the live
 * checkout. It only shows a harmless local prototype message.
 */
export function CheckoutCTA() {
  const [notice, setNotice] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setNotice(true)}
        className="flex h-14 w-full items-center justify-center rounded-full bg-[var(--eo-red)] px-6 text-base font-bold text-white shadow-sm transition-all duration-150 hover:brightness-95 motion-safe:hover:-translate-y-px motion-safe:hover:shadow-lg motion-safe:active:translate-y-0 motion-safe:active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--eo-red)]"
      >
        Start saving &mdash; £0 today
      </button>

      <p className="mt-2.5 text-center text-xs font-medium text-[var(--eo-muted)]">
        30 days free &bull; Then £4.99/month &bull; Cancel anytime
      </p>

      {notice && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-dashed border-[var(--eo-red)]/40 bg-[var(--eo-red)]/5 px-3 py-2 text-center text-sm font-medium text-[var(--eo-red)]"
        >
          Prototype only &mdash; Stripe integration not connected.
        </p>
      )}
    </div>
  )
}
