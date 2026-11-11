// api/payment/create-checkout-session/route.ts
// Retired: the legacy Stripe-hosted customer checkout has been replaced by
// /checkout (/api/payment/create-subscription). This endpoint intentionally
// performs no Stripe, database, email or cookie operations.
import { NextResponse } from "next/server"

const RETIRED_RESPONSE = {
  error: "legacy_checkout_retired",
  message: "Legacy checkout has been retired. Please use /checkout to subscribe.",
}

function gone() {
  return NextResponse.json(RETIRED_RESPONSE, {
    status: 410,
    headers: { "Cache-Control": "no-store" },
  })
}

export const POST = gone
export const GET = gone
