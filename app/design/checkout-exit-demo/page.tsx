import type { Metadata } from "next"
import { CheckoutExitDemo } from "@/components/prototypes/eatinout-exit-demo/checkout-exit-demo"

/**
 * ISOLATED DESIGN DEMO — /design/checkout-exit-demo
 *
 * A visual/interaction demo of the EatinOut checkout exit-intent intercept.
 * The approved modal is the supplied PNG, shown over the existing isolated
 * Stripe checkout prototype. Not linked from any navigation, sitemap, signup,
 * checkout or account journey — accessible only by manually entering the URL.
 * Indexing disabled. No production checkout / Stripe / auth / history logic is
 * involved.
 */
export const metadata: Metadata = {
  title: "Checkout Exit Intercept Demo (internal)",
  robots: {
    index: false,
    follow: false,
  },
}

export default function CheckoutExitDemoPage() {
  return <CheckoutExitDemo />
}
