import { NationalOfferCardPreview } from "@/components/national/national-offer-card-preview"

const sampleOffer = {
  brandName: "Sample Brand",
  brandInitials: "SB",
  headline: "25% off your food bill, Monday to Thursday",
  discountLabel: "25% OFF",
  description: "Dine in at any participating UK restaurant. Valid for up to 4 diners per table.",
  expiryLabel: "Ends 31 Dec 2026",
  terms: [
    "Dine-in only. Not valid with any other offer.",
    "Excludes drinks and service charge.",
    "Show your EatinOut code before ordering.",
  ],
}

const specs = [
  { label: "Image area", value: "16:9, full card width (390px viewport ≈ 358 × 201px)" },
  { label: "Photo upload", value: "Min 1280 × 720px, cropped to fill (object-cover)" },
  { label: "Artwork upload", value: "Any ratio, shown in full on a neutral background (object-contain)" },
  { label: "Brand logo", value: "Separate 44px tile, never cropped or stretched (object-contain)" },
  { label: "Offer text", value: "Below the image, never baked into the photograph" },
]

function MobileFrame({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2" aria-labelledby={`${title}-heading`}>
      <div>
        <h2 id={`${title}-heading`} className="text-sm font-semibold text-slate-900">
          {title}
        </h2>
        <p className="text-xs text-slate-500">{note}</p>
      </div>
      <div className="w-[390px] max-w-full rounded-[28px] border-4 border-slate-800 bg-[var(--eo-bg)] p-4 shadow-lg">
        {children}
      </div>
    </section>
  )
}

export default function NationalImagePreviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">National offer card preview</h1>
        <p className="text-sm text-slate-500">
          Visual-only design proposal at a 390px mobile width. Placeholder imagery, no live data. The full offer is
          visible before sign-up; only claiming needs an account.
        </p>
      </header>

      <div className="flex flex-wrap gap-8">
        <MobileFrame title="Treatment 1: Photography" note="Photo is cropped to fill the 16:9 area.">
          <NationalOfferCardPreview {...sampleOffer} imageTreatment="photo" />
        </MobileFrame>
        <MobileFrame title="Treatment 2: Promotional artwork" note="Artwork is shown completely, with no cropping.">
          <NationalOfferCardPreview {...sampleOffer} imageTreatment="artwork" />
        </MobileFrame>
      </div>

      <section aria-labelledby="specs-heading" className="max-w-2xl rounded-xl border border-slate-200 bg-white p-4">
        <h2 id="specs-heading" className="mb-3 text-sm font-semibold text-slate-900">
          Proposed image proportions
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          {specs.map((spec) => (
            <div key={spec.label} className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
              <dt className="shrink-0 font-medium text-slate-700 sm:w-36">{spec.label}</dt>
              <dd className="text-slate-500">{spec.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
