/**
 * PROTOTYPE PLACEHOLDER — not a real payment button.
 *
 * DEV INTEGRATION POINT:
 * Replace this region with Stripe ExpressCheckoutElement.
 * Do not manually recreate Apple Pay / Google Pay buttons in production —
 * Stripe renders and secures the real wallet buttons.
 *
 * The buttons below are non-interactive visual mocks so developers can see the
 * intended layout and dimensions. They submit nothing and simulate no payment.
 */
export function StripeExpressCheckoutPlaceholder() {
  return (
    <section
      aria-label="Express payment options"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {/* Apple Pay wallet button (visual mock) */}
      <div
        aria-hidden="true"
        className="flex h-12 items-center justify-center gap-1.5 rounded-lg bg-black text-base font-medium tracking-tight text-white"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M17.543 12.634c-.026-2.63 2.147-3.89 2.245-3.95-1.223-1.787-3.124-2.032-3.8-2.058-1.619-.164-3.16.955-3.98.955-.82 0-2.088-.931-3.434-.905-1.767.026-3.397 1.027-4.307 2.61-1.837 3.183-.469 7.895 1.318 10.48.874 1.266 1.916 2.687 3.281 2.636 1.315-.052 1.814-.852 3.404-.852 1.59 0 2.038.852 3.43.826 1.416-.026 2.313-1.29 3.181-2.559 1.001-1.469 1.414-2.892 1.44-2.965-.031-.013-2.765-1.062-2.792-4.21zM15.14 4.87c.726-.88 1.215-2.104 1.082-3.323-1.046.042-2.312.696-3.062 1.576-.673.78-1.262 2.025-1.104 3.22 1.166.09 2.358-.593 3.084-1.473z" />
        </svg>
        <span>Pay</span>
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
    </section>
  )
}
