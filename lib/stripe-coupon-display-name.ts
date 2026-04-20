/**
 * Stripe Coupon `name` for Checkout / Dashboard.
 * Uses optional `customName` when set; otherwise the voucher `code` (uppercase).
 */
export function resolveStripeCouponCheckoutName(
  code: string,
  customName?: string | null,
): string {
  const custom = (customName ?? "").trim();
  const base = (code || "").trim().toUpperCase();
  const name = custom || base || "Discount";
  const max = 255;
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "…";
}
