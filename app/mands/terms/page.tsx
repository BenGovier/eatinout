import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "£25 M&S E-Gift Card Promotion — Terms & Conditions | EatinOut",
  description:
    "Full terms and conditions for the EatinOut £25 Marks & Spencer e-gift card promotion. Eligible new members can claim after six successful monthly payments.",
  robots: { index: true, follow: true },
}

/**
 * Dedicated terms page for the M&S £25 e-gift card promotion, linked from the
 * /mands landing page FAQ. Kept separate from the site-wide /terms page so the
 * promotion T&Cs stay scoped to this campaign. Content parsed verbatim from the
 * supplied Terms & Conditions document (last updated 17 August 2026).
 */
export default function MandsTermsPage() {
  return (
    <main className="min-h-screen bg-[var(--eo-bg)] py-10 text-[var(--eo-ink)] sm:py-14">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <Link
          href="/mands"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--eo-muted)] transition-colors hover:text-[var(--eo-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to offer
        </Link>

        <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          EatinOut £25 M&amp;S E-Gift Card Promotion
        </h1>
        <p className="mt-2 text-lg font-semibold text-[var(--eo-muted)]">Terms &amp; Conditions</p>

        <div className="mt-8 space-y-8 text-pretty text-[15px] leading-relaxed text-[var(--eo-ink)]/90">
          <section className="space-y-3">
            <p>These terms and conditions apply to the EatinOut £25 M&amp;S e-gift card promotion (&ldquo;Promotion&rdquo;).</p>
            <p>By participating in the Promotion, you agree to these terms and conditions.</p>
          </section>

          <Term title="The Promoter">
            <p>
              The promoter is EATINOUT LTD, trading as EatinOut (&ldquo;EatinOut&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;
              or &ldquo;our&rdquo;), registered in England and Wales under company number 13065666, with registered office
              at Old Docks House, 90 Water Lane, Ashton-on-Ribble, PR2 1AU, United Kingdom.
            </p>
          </Term>

          <Term title="The Promotion">
            <p>
              Eligible new EatinOut members can claim one £25 Marks &amp; Spencer e-gift card after making six successful
              monthly EatinOut membership payments, subject to these terms.
            </p>
            <p>
              The reward is not provided automatically. Eligible members must submit a valid claim in accordance with the
              &ldquo;How to Claim&rdquo; section below.
            </p>
          </Term>

          <Term title="Eligibility">
            <p>To qualify for the Promotion, you must:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>be aged 18 or over;</li>
              <li>be resident in the United Kingdom;</li>
              <li>join EatinOut as a new member during the promotional period;</li>
              <li>join through a page, advertisement or promotion specifically offering the £25 M&amp;S e-gift card;</li>
              <li>provide genuine and accurate registration and payment information;</li>
              <li>successfully complete six monthly paid membership payments; and</li>
              <li>satisfy all other requirements contained in these terms.</li>
            </ul>
            <p>The Promotion is available only to new qualifying EatinOut memberships using promo code M&amp;S25.</p>
            <p>Customers who previously held an EatinOut membership are excluded from the Promotion.</p>
            <p>
              A member becomes eligible to claim the reward only once six separate successful monthly EatinOut membership
              payments have been collected.
            </p>
            <p>
              A payment will only count towards the six-payment requirement once it has been successfully processed and has
              not subsequently been:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>refunded;</li>
              <li>reversed;</li>
              <li>charged back;</li>
              <li>disputed; or</li>
              <li>otherwise cancelled or returned.</li>
            </ul>
            <p>Failed or declined payments do not count.</p>
            <p>Promo code M&amp;S25 cannot be used in conjunction with any other offer.</p>
          </Term>

          <Term title="Membership Status">
            <p>Your EatinOut membership must remain active and fully paid at the time you submit your reward claim.</p>
          </Term>

          <Term title="How to Claim">
            <p>
              Once you have made your sixth successful monthly membership payment, you will have 30 days from the date that
              payment is successfully processed to submit your reward claim.
            </p>
            <p>Claims must be submitted by email to:</p>
            <p className="rounded-lg bg-white p-4 font-semibold ring-1 ring-black/10">
              <a href="mailto:dina@eatinout.com" className="text-[var(--eo-red)] underline underline-offset-2">
                dina@eatinout.com
              </a>
            </p>
            <p>You may be required to confirm:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>your full name;</li>
              <li>the email address associated with your EatinOut account;</li>
              <li>your EatinOut membership details; and</li>
              <li>any reasonable information necessary for us to verify eligibility.</li>
            </ul>
            <p>
              Claims submitted more than 30 days after the sixth successful monthly payment will expire and the reward will
              no longer be available.
            </p>
            <p>It is the member&apos;s responsibility to submit their claim within the claim period.</p>
          </Term>

          <Term title="One Reward Per Customer">
            <p>A maximum of one £25 M&amp;S e-gift card may be claimed per person under this Promotion.</p>
            <p>The Promotion must not be used to obtain multiple rewards through duplicate or linked accounts.</p>
            <p>
              We may consider factors including names, contact information, payment methods, account information and other
              reasonable indicators when identifying duplicate or abusive claims.
            </p>
            <p>
              Creating multiple accounts, using false information, manipulating payment arrangements or otherwise attempting
              to obtain more than one promotional reward may result in all associated claims being rejected.
            </p>
          </Term>

          <Term title="Verification and Fraud Prevention">
            <p>EatinOut reserves the right to verify that a member has complied with these terms before approving a reward.</p>
            <p>We may withhold or reject a reward where we reasonably believe that:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>an account has been created primarily to abuse the Promotion;</li>
              <li>false or misleading information has been provided;</li>
              <li>multiple accounts are being operated by the same person to obtain additional rewards;</li>
              <li>payment fraud, chargebacks or payment manipulation has occurred;</li>
              <li>the member has otherwise attempted to circumvent these terms; or</li>
              <li>there has been a technical or administrative error affecting eligibility.</li>
            </ul>
            <p>We may request reasonable evidence to verify a claim. We will not reject a genuine claim arbitrarily.</p>
          </Term>

          <Term title="The Reward">
            <p>Each successful claim entitles the qualifying member to one £25 Marks &amp; Spencer e-gift card.</p>
            <p>There is no cash alternative.</p>
            <p>
              The promotional reward cannot be exchanged by EatinOut for cash, account credit or another reward except where
              EatinOut reasonably determines that a substitute is necessary.
            </p>
            <p>The M&amp;S e-gift card will be subject to Marks &amp; Spencer&apos;s own gift card terms and conditions.</p>
          </Term>

          <Term title="Delivery">
            <p>
              Approved e-gift cards will be sent to the email address associated with the qualifying EatinOut membership,
              unless otherwise agreed.
            </p>
            <p>Members are responsible for ensuring that the email address registered with EatinOut is correct.</p>
            <p>
              We aim to review claims within 14 days of submission, and where approved the e-gift card will be issued within
              14 days of approval.
            </p>
            <p>
              EatinOut is not responsible for delays caused by incorrect customer information, email filtering or
              circumstances reasonably outside our control.
            </p>
          </Term>

          <Term title="Lost or Misused E-Gift Cards">
            <p>
              Once an e-gift card has been successfully supplied to the email address provided by the member, responsibility
              for keeping the gift card details secure passes to the recipient.
            </p>
            <p>
              Members should contact us promptly if they believe a reward has not been received. We may investigate delivery
              records before replacing any reward.
            </p>
          </Term>

          <Term title="Refunds, Chargebacks and Reversed Payments">
            <p>
              If any of the six payments used to qualify for the Promotion is subsequently refunded, reversed or successfully
              charged back before the reward is issued, the member will cease to qualify unless and until six valid
              qualifying payments have been made.
            </p>
            <p>
              Where there is evidence of deliberate payment manipulation or promotional abuse, EatinOut reserves the right to
              refuse future participation in promotional offers.
            </p>
            <p>Nothing in these terms affects a customer&apos;s statutory rights.</p>
          </Term>

          <Term title="Availability">
            <p>Rewards are subject to availability.</p>
            <p>
              If an M&amp;S e-gift card becomes unavailable for reasons outside EatinOut&apos;s reasonable control, we may
              provide an alternative reward of equal or greater monetary value.
            </p>
          </Term>

          <Term title="Promotion Period">
            <p>The Promotion is available to eligible customers who join between:</p>
            <ul className="list-none space-y-1.5">
              <li>
                <span className="font-semibold">Promotion starts:</span> 1 September 2026 at 00:01 (BST)
              </li>
              <li>
                <span className="font-semibold">Promotion ends:</span> 31 October 2026 at 23:59 (GMT)
              </li>
            </ul>
            <p>
              Customers who join outside the promotional period will not qualify unless EatinOut expressly extends the
              Promotion.
            </p>
            <p>
              Customers who validly join during the promotional period may complete their six qualifying payments after the
              promotional sign-up period has ended.
            </p>
          </Term>

          <Term title="Cancellation of the Promotion">
            <p>
              EatinOut may suspend or withdraw the Promotion where circumstances outside our reasonable control make this
              necessary.
            </p>
            <p>
              Withdrawal of the Promotion will not remove the entitlement of customers who have already validly entered the
              Promotion and subsequently satisfy the published eligibility requirements, except where doing so is impossible
              for reasons outside our reasonable control.
            </p>
          </Term>

          <Term title="Relationship With Marks &amp; Spencer">
            <p>This Promotion is operated by EatinOut.</p>
            <p>
              Marks &amp; Spencer is not the promoter of this offer and is not responsible for administering eligibility or
              EatinOut membership claims.
            </p>
            <p>Marks &amp; Spencer&apos;s own terms and conditions apply to the use of M&amp;S gift cards.</p>
          </Term>

          <Term title="General">
            <p>EatinOut&apos;s standard membership terms and conditions continue to apply to your EatinOut membership.</p>
            <p>
              If there is any conflict between these promotional terms and EatinOut&apos;s general membership terms
              specifically concerning eligibility for this Promotion, these promotional terms will apply to the Promotion.
            </p>
            <p>Nothing in these terms excludes or limits any rights that cannot legally be excluded or limited.</p>
            <p>
              These terms are governed by the laws of England and Wales, subject to any mandatory consumer rights applying in
              the customer&apos;s place of residence.
            </p>
          </Term>

          <p className="border-t border-black/10 pt-6 text-sm font-medium text-[var(--eo-muted)]">
            Last updated: 17 August 2026
          </p>
        </div>
      </div>
    </main>
  )
}

function Term({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold tracking-tight text-[var(--eo-ink)]">{title}</h2>
      {children}
    </section>
  )
}
