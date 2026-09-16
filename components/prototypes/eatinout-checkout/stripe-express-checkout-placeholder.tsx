/**
 * PROTOTYPE PLACEHOLDER — not a real payment button.
 *
 * DEV INTEGRATION POINT:
 * Replace this placeholder with Stripe ExpressCheckoutElement.
 * Do not manually recreate Apple Pay / Google Pay buttons in production.
 *
 * The buttons below are non-interactive visual mocks so developers can see
 * the intended layout and dimensions. They submit nothing.
 */
export function StripeExpressCheckoutPlaceholder() {
  return (
    <section aria-label="Express payment options (prototype placeholder)" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* Apple Pay wallet button (visual mock) */}
      <div
        aria-hidden="true"
        className="flex h-12 items-center justify-center rounded-lg bg-black text-base font-medium tracking-tight text-white"
      >
        <span className="mr-1 text-lg leading-none"></span> Pay
      </div>

      {/* Google Pay wallet button (visual mock) */}
      <div
        aria-hidden="true"
        className="flex h-12 items-center justify-center rounded-lg border border-black/10 bg-white text-base font-medium tracking-tight text-[var(--eo-ink)] shadow-sm"
      >
        <span className="mr-1.5 font-bold">
          <span className="text-[#4285F4]">G</span>
          <span className="text-[#EA4335]">o</span>
          <span className="text-[#FBBC05]">o</span>
          <span className="text-[#4285F4]">g</span>
          <span className="text-[#34A853]">l</span>
          <span className="text-[#EA4335]">e</span>
        </span>
        Pay
      </div>

      <p className="col-span-full text-center text-xs text-[var(--eo-muted)]">
        Mock express checkout &mdash; Stripe ExpressCheckoutElement will render Apple&nbsp;Pay &amp; Google&nbsp;Pay here.
      </p>
    </section>
  )
}
