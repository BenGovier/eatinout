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
        className="flex h-12 w-full items-center justify-center rounded-full bg-[var(--eo-red)] px-6 text-base font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--eo-red)]"
      >
        Start my free trial
      </button>

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
