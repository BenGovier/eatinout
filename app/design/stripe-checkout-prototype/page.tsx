import type { Metadata } from "next"
import { EatinOutCheckoutPrototype } from "@/components/prototypes/eatinout-checkout/eatinout-checkout-prototype"

/**
 * ISOLATED DESIGN PROTOTYPE — /design/stripe-checkout-prototype
 *
 * Visual target for a future EatinOut integrated Stripe checkout.
 * Not linked from any navigation, sitemap, signup or account journey.
 * Accessible only by manually entering the URL. Indexing is disabled.
 */
export const metadata: Metadata = {
  title: "Checkout Prototype (internal)",
  robots: {
    index: false,
    follow: false,
  },
}

export default function StripeCheckoutPrototypePage() {
  return <EatinOutCheckoutPrototype />
}
