/**
 * Offer-type data for the EatinOut Lancashire landing page.
 *
 * These are offer CATEGORIES (not specific restaurants) so the page can run
 * for a Facebook ad campaign without naming venues that aren't approved
 * partners. Swap in real approved partner offers later by satisfying the
 * `OfferType[]` shape — the grid renders identically.
 *
 * Nothing here touches production data — it is local, presentational content
 * used only by this isolated landing page.
 */

export interface OfferType {
  id: string
  /** Dominant saving headline, e.g. "50% off food" */
  saving: string
  /** Short human title for the occasion */
  title: string
  /** One-line, benefit-led description */
  blurb: string
  /** Warm, dining-out (not takeaway) lifestyle photography */
  image: string
  /** Optional small tag */
  tag?: string
}

export const OFFER_TYPES: OfferType[] = [
  {
    id: "half-price-food",
    saving: "50% off food",
    title: "Dinner for two",
    blurb: "Half off the food bill at local restaurants across Lancashire.",
    image: "/images/prestonblog/moment-grill.png",
    tag: "Most popular",
  },
  {
    id: "quarter-off-bill",
    saving: "25% off your bill",
    title: "Catch-ups with friends",
    blurb: "A quarter off the whole bill — food and drinks included.",
    image: "/images/prestonblog/moment-pizza.png",
  },
  {
    id: "two-for-one-mains",
    saving: "2-for-1 mains",
    title: "Midweek treat",
    blurb: "Buy one main, get one free at participating venues.",
    image: "/images/prestonblog/moment-burger.png",
  },
  {
    id: "lunch-offers",
    saving: "Lunch offers",
    title: "Lunch out for less",
    blurb: "Discounted set lunches and daytime deals near work.",
    image: "/images/prestonblog/moment-brunch.png",
  },
  {
    id: "date-night",
    saving: "Date night deals",
    title: "Date night",
    blurb: "Three courses and a drink for two, without the full price.",
    image: "/images/prestonblog/moment-datenight.png",
    tag: "Loved by couples",
  },
  {
    id: "family-meals",
    saving: "Family offers",
    title: "Family meals out",
    blurb: "Bring everyone along and still spend less than staying in.",
    image: "/images/prestonblog/moment-family.png",
  },
]

/** Lancashire towns for local proof — friendly, real places. */
export const LANCASHIRE_TOWNS = [
  "Preston",
  "Blackpool",
  "Blackburn",
  "Burnley",
  "Lytham",
  "Lancaster",
]
