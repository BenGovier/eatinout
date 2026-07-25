// AUDIT-ONLY render harness. Renders each existing email template to a
// standalone HTML file using realistic EXAMPLE data. It does NOT modify any
// template and does NOT send any email. Output is written to
// email-audit-previews/html/. This file is deleted after the audit.
import { render } from "@react-email/render"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import * as React from "react"

// The existing templates use the classic JSX runtime (React must be in scope).
;(globalThis as any).React = React

const OUT = join(process.cwd(), "email-audit-previews", "html")
mkdirSync(OUT, { recursive: true })

// Example (non-real) data per the audit brief.
const firstName = "Sarah"
const lastName = "Thompson"
const email = "sarah.thompson@example.com"
const restaurantName = "The Italian Orchard"
const exampleImg = "https://via.placeholder.com/600x300?text=The+Italian+Orchard"

async function main() {
  const WelcomeEmail = (await import("../../utils/email-templates/welcome")).default
  const { SubscriptionConfirmationEmail } = await import("../../utils/email-templates/subscription-confirmation")
  const PasswordResetEmail = (await import("../../utils/email-templates/password-reset")).default
  const AccountDeletionRequestEmail = (await import("../../utils/email-templates/AccountDeletionRequestEmail")).default
  const RestaurantRegistrationEmail = (await import("../../utils/email-templates/RestaurantRegistrationEmail")).default
  const { RestaurantApprovalEmail } = await import("../../utils/email-templates/restuarant-approval")
  const NewOfferSubmissionEmail = (await import("../../utils/email-templates/NewOfferSubmissionEmail")).default
  const { getContactEmailHTML } = await import("../../utils/email-templates/contactEmail")
  const SubscriptionCancellationEmail = (await import("../../utils/email-templates/SubscriptionCancellationEmail")).default
  const SubscriptionReactivationEmail = (await import("../../utils/email-templates/SubscriptionReactivationEmail")).default

  const files: Record<string, string> = {}

  files["01-welcome"] = await render(
    WelcomeEmail({
      firstName,
      trialEndDate: "2026-08-24T00:00:00.000Z",
      selectedPlan: { name: "Premium Membership", price: "£4.99", period: "/month" },
    }),
  )

  files["02-subscription-confirmation"] = await render(
    SubscriptionConfirmationEmail({
      firstName,
      planName: "Premium Membership",
      amount: "£4.99",
      billingDate: "15th of each month",
      startDate: "2026-07-25T00:00:00.000Z",
    }),
  )

  files["03-password-reset"] = await render(
    PasswordResetEmail({
      firstName,
      resetLink: "https://eatinout.com/forgot-password?token=EXAMPLE_TOKEN_DO_NOT_USE",
      expiryTime: "1 hour",
    }),
  )

  files["04-account-deletion-request"] = await render(
    AccountDeletionRequestEmail({
      firstName,
      lastName,
      email,
      requestDate: "2026-07-27T10:30:00.000Z",
      userId: "EXAMPLE_USER_ID",
    }),
  )

  files["05-restaurant-registration"] = await render(
    RestaurantRegistrationEmail({
      ownerName: `${firstName} ${lastName}`,
      restaurantName,
      restaurantImage: exampleImg,
    }),
  )

  files["06-restaurant-approval"] = await render(
    RestaurantApprovalEmail({
      ownerName: firstName,
      restaurantName,
      restaurantImage: exampleImg,
    }),
  )

  files["07-new-offer-submission"] = await render(
    NewOfferSubmissionEmail({
      venueName: restaurantName,
      offerTitle: "2-for-1 Main Courses",
      offerDescription: "Buy one main course and get a second of equal or lesser value free.",
      offerType: "Dine In",
      validDays: "Monday to Thursday",
      validHours: "5pm - 9pm",
      startDate: "2026-07-27T00:00:00.000Z",
      expiryDate: "2026-10-27T00:00:00.000Z",
      termsAndConditions: "Not valid on public holidays. One offer per table.",
      dineIn: true,
      dineOut: false,
      runUntilFurther: false,
      submissionDate: "2026-07-27T00:00:00.000Z",
    }),
  )

  files["08-contact-restaurant"] = getContactEmailHTML({
    type: "restaurant",
    name: `${firstName} ${lastName}`,
    email,
    phone: "01772 000000",
    restaurantName,
    location: "Preston, Lancashire",
    message: "We would love to partner with EatinOut for our new menu launch.",
  })

  files["08b-contact-user"] = getContactEmailHTML({
    type: "user",
    name: `${firstName} ${lastName}`,
    email,
    enquiryType: "Billing question",
    message: "I have a question about my 30-day free trial and the £4.99 per month charge.",
  })

  // 09 - Email change OTP: reproduced EXACTLY from the inline template in
  // app/api/restaurant/request-email-change/route.ts (example OTP only).
  const otp = "483920"
  files["09-email-change-otp"] = `
  <div style="font-family: 'Arial', sans-serif; background-color: #f9fafb; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 30px; text-align: center; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      <h2 style="color: #111827; margin-bottom: 10px;">Verify Your Email</h2>
      <p style="color: #6b7280; font-size: 16px; margin-bottom: 20px;">
        Enter the following OTP to confirm your email address:
      </p>
      <div style="font-size: 28px; letter-spacing: 5px; font-weight: bold; color: #2563eb; margin-bottom: 30px;">
        ${otp}
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        This OTP is valid for 5 minutes.
      </p>
      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
        If you did not request this, please ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="font-size: 12px; color: #9ca3af;">&copy; ${new Date().getFullYear()} EatinOut. All rights reserved.</p>
    </div>
  </div>
  `

  files["10-cancellation-trial-immediate"] = await render(
    SubscriptionCancellationEmail({ firstName, mode: "trial_immediate" }),
  )

  files["11-cancellation-paid-scheduled"] = await render(
    SubscriptionCancellationEmail({
      firstName,
      mode: "paid_scheduled",
      currentPeriodEnd: "Monday, 27 July 2026",
    }),
  )

  files["12-reactivation"] = await render(
    SubscriptionReactivationEmail({ firstName, nextPaymentDate: "Monday, 27 July 2026" }),
  )

  for (const [name, html] of Object.entries(files)) {
    writeFileSync(join(OUT, `${name}.html`), html, "utf8")
    console.log(`[v0] wrote ${name}.html (${html.length} bytes)`)
  }
  console.log(`[v0] DONE: ${Object.keys(files).length} previews written to ${OUT}`)
}

main().catch((err) => {
  console.error("[v0] render failed:", err)
  process.exit(1)
})
