export const JOIN_MARKETING_CONSENT_SOURCE = "join"

type MarketingConsentFields = {
  marketing_email_consent: boolean
  marketing_email_consent_at: string
  marketing_email_consent_source: string
}

// Only the /join form sends marketingEmailConsent. Older sign-up pages omit it,
// so their new accounts get no consent fields rather than a misattributed source.
export function buildMarketingConsentFields(
  marketingEmailConsent: boolean | undefined,
): MarketingConsentFields | Record<string, never> {
  if (typeof marketingEmailConsent !== "boolean") return {}
  return {
    marketing_email_consent: marketingEmailConsent,
    marketing_email_consent_at: new Date().toISOString(),
    marketing_email_consent_source: JOIN_MARKETING_CONSENT_SOURCE,
  }
}
