import type { Metadata } from "next"
import { EatinOutCheckoutLive } from "@/components/checkout/eatinout-checkout-live"

export const metadata: Metadata = {
  title: "Checkout | EatinOut",
  robots: { index: false, follow: false },
}

export default function CheckoutPage() {
  return <EatinOutCheckoutLive />
}