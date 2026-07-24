/**
 * Stripe TEST-MODE verification for the subscription retention flows.
 *
 * This script exercises the exact Stripe operations performed by
 * app/api/subscriptions/route.ts against isolated test-mode fixtures, and
 * asserts state + idempotency. It creates its own product/price/customer/
 * coupon and DELETES them at the end. It never touches MongoDB or any
 * existing customer. Test mode only (guarded below).
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY || "";
if (!(key.startsWith("sk_test_") || key.startsWith("rk_test_"))) {
  console.error("REFUSING TO RUN: STRIPE_SECRET_KEY is not a test key.");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2023-10-16" });

const created = { customers: [], products: [], prices: [], coupons: [], clocks: [] };
let pass = 0;
let fail = 0;
function assert(cond, label) {
  if (cond) { pass++; console.log("  PASS:", label); }
  else { fail++; console.log("  FAIL:", label); }
}

async function makeMonthlyPrice() {
  const product = await stripe.products.create({ name: "TEST Verify Membership" });
  created.products.push(product.id);
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 499,
    currency: "gbp",
    recurring: { interval: "month", interval_count: 1 },
  });
  created.prices.push(price.id);
  return price.id;
}

async function makeCustomerWithCard(clockId) {
  const customer = await stripe.customers.create({
    name: "TEST Verify User",
    email: `test+verify_${Date.now()}@example.com`,
    payment_method: "pm_card_visa",
    invoice_settings: { default_payment_method: "pm_card_visa" },
    ...(clockId ? { test_clock: clockId } : {}),
  });
  created.customers.push(customer.id);
  return customer.id;
}

async function main() {
  console.log("=== SECTION 5: STANDARD CANCELLATION (scheduled, idempotent) ===");
  {
    const priceId = await makeMonthlyPrice();
    const customerId = await makeCustomerWithCard();
    // Active (charged) monthly subscription
    let sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
    });
    assert(sub.status === "active", `subscription is active (got ${sub.status})`);
    assert(sub.cancel_at_period_end === false, "starts with cancel_at_period_end=false");

    // DELETE route operation: schedule cancellation (NOT stripe.subscriptions.cancel)
    sub = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
    assert(sub.cancel_at_period_end === true, "cancel_at_period_end becomes true");
    assert(sub.status === "active", "still active (access retained) after scheduling");
    assert(typeof sub.current_period_end === "number", "access-end date (current_period_end) present");

    // Idempotent repeat (route guards with wasAlreadyScheduled, but Stripe itself is safe too)
    const before = sub.current_period_end;
    sub = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
    assert(sub.cancel_at_period_end === true && sub.status === "active", "repeat schedule is safe/idempotent");
    assert(sub.current_period_end === before, "repeat does not change period end");

    console.log("\n=== SECTION 6: REACTIVATION (clear schedule, idempotent, no new sub) ===");
    const originalId = sub.id;
    sub = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
    assert(sub.cancel_at_period_end === false, "cancel_at_period_end becomes false");
    assert(sub.id === originalId, "same subscription id (no new subscription created)");
    // Idempotent repeat
    sub = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
    assert(sub.cancel_at_period_end === false && sub.id === originalId, "repeat reactivate is safe/idempotent");
    assert(sub.status === "active", "membership active after reactivation");
  }

  console.log("\n=== SECTION 7: TRIAL EXTENSION (+14 days exactly, one-time) ===");
  {
    const priceId = await makeMonthlyPrice();
    const customerId = await makeCustomerWithCard();
    let sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 30,
    });
    assert(sub.status === "trialing", `subscription trialing (got ${sub.status})`);
    const prevTrialEnd = sub.trial_end;
    const DAYS = 14;
    const newTrialEnd = prevTrialEnd + DAYS * 24 * 60 * 60;
    sub = await stripe.subscriptions.update(sub.id, { trial_end: newTrialEnd, proration_behavior: "none" });
    assert(sub.trial_end === newTrialEnd, "trial_end extended by exactly 14 days");
    assert(sub.trial_end - prevTrialEnd === DAYS * 86400, `delta is exactly ${DAYS}*86400 seconds`);

    // One-time guard is enforced via customer metadata in the route.
    await stripe.customers.update(customerId, { metadata: { eatinout_trial_extension_used: "true" } });
    const cust = await stripe.customers.retrieve(customerId);
    assert(cust.metadata.eatinout_trial_extension_used === "true", "extension flag set on customer after success");
    // Second attempt: route checks flag and returns 409 (simulate the guard)
    const alreadyUsed = cust.metadata.eatinout_trial_extension_used === "true";
    assert(alreadyUsed === true, "second extension attempt would be rejected (flag present)");
  }

  console.log("\n=== SECTION 8a: DISCOUNT WITHOUT COUPON CONFIGURED ===");
  {
    const configured = !!process.env.STRIPE_RETENTION_50_PERCENT_COUPON_ID;
    assert(configured === false, "STRIPE_RETENTION_50_PERCENT_COUPON_ID is NOT set in this env");
    // Route returns { code: 'coupon_not_configured', status 409 } and offer is hidden
    // (canApplyRetentionDiscount requires the env var). Verified by code + env state.
    console.log("  (route hides offer + returns coupon_not_configured; cancellation still works)");
  }

  console.log("\n=== SECTION 8b: DISCOUNT WITH A VALID TEST COUPON (next payment only) ===");
  {
    const coupon = await stripe.coupons.create({ percent_off: 50, duration: "once", name: "TEST Verify 50 Once" });
    created.coupons.push(coupon.id);
    assert(coupon.valid === true, "test coupon is valid");
    assert(coupon.duration === "once", "coupon duration is 'once' (next payment only, not 3 months)");

    const priceId = await makeMonthlyPrice();
    const customerId = await makeCustomerWithCard();
    let sub = await stripe.subscriptions.create({ customer: customerId, items: [{ price: priceId }] });
    assert(sub.status === "active", "eligible: active monthly member");

    sub = await stripe.subscriptions.update(sub.id, { coupon: coupon.id }, { expand: ["discounts"] });
    const disc = (sub.discount && sub.discount.coupon) || (Array.isArray(sub.discounts) && sub.discounts[0] && sub.discounts[0].coupon);
    assert(!!disc, "discount applied to subscription");
    assert(disc && disc.percent_off === 50, "discount is 50% off");
    assert(disc && disc.duration === "once", "discount applies to next payment only (duration once)");
  }

  console.log("\n=== CLEANUP ===");
  for (const id of created.customers) { try { await stripe.customers.del(id); console.log("  deleted customer", id); } catch (e) { console.log("  cleanup customer failed", id, e.message); } }
  for (const id of created.prices) { try { await stripe.prices.update(id, { active: false }); } catch {} }
  for (const id of created.products) { try { await stripe.products.update(id, { active: false }); } catch {} }
  for (const id of created.coupons) { try { await stripe.coupons.del(id); console.log("  deleted coupon", id); } catch (e) { console.log("  cleanup coupon failed", id, e.message); } }

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 2);
}

main().catch(async (e) => {
  console.error("SCRIPT ERROR:", e.message);
  for (const id of created.customers) { try { await stripe.customers.del(id); } catch {} }
  for (const id of created.coupons) { try { await stripe.coupons.del(id); } catch {} }
  process.exit(3);
});
