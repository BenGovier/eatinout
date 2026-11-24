const ALLOWED_CHARACTERS = /^\+?[\d\s().-]+$/
const MIN_DIGITS = 7
const MAX_DIGITS = 15

export const MOBILE_NUMBER_ERROR = "Please enter a valid mobile number, or leave it blank."

/**
 * Trims and collapses whitespace in an optional mobile number.
 * Returns null for empty input, "invalid" when the value cannot be a UK or international number.
 */
export function normalizeOptionalMobile(value: unknown): string | null | "invalid" {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return "invalid"
  const trimmed = value.trim().replace(/\s+/g, " ")
  if (!trimmed) return null
  if (!ALLOWED_CHARACTERS.test(trimmed) || trimmed.indexOf("+") > 0) return "invalid"
  const digitCount = trimmed.replace(/\D/g, "").length
  if (digitCount < MIN_DIGITS || digitCount > MAX_DIGITS) return "invalid"
  return trimmed
}
