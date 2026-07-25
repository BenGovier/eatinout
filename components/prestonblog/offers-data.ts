/**
 * Live-offer data contract for the /prestonblog landing page.
 *
 * This shape is intentionally simple so real, live Preston offers can be
 * injected later (from an API, CMS or the EatinOut offers table) WITHOUT
 * redesigning the page. Swap `SAMPLE_PRESTON_OFFERS` for live data that
 * satisfies `PrestonOffer[]` and the grid renders exactly the same.
 *
 * Nothing here touches production data — it is local, presentational sample
 * content used only by this isolated landing page.
 */

export interface PrestonOffer {
  id: string
  /** Restaurant / venue name */
  name: string
  /** Cuisine tag, e.g. "Modern British" */
  cuisine: string
  /** Preston area / neighbourhood for local flavour */
  area: string
  /** Short, appetising dish line — sets the scene, not a menu */
  dish: string
  /** Headline saving, e.g. "50% off food" */
  saving: string
  /** Edge-to-edge food photography */
  image: string
  /** Optional: marks a limited / popular offer for the badge */
  tag?: "Popular" | "New" | "Weekends"
}

export const SAMPLE_PRESTON_OFFERS: PrestonOffer[] = [
  {
    id: "winckley-grill",
    name: "The Winckley Table",
    cuisine: "Modern British Grill",
    area: "Winckley Square",
    dish: "28-day aged sirloin, triple-cooked chips, peppercorn sauce",
    saving: "50% off food",
    image: "/images/prestonblog/restaurant-steak.png",
    tag: "Popular",
  },
  {
    id: "trattoria-bianca",
    name: "Trattoria Bianca",
    cuisine: "Italian",
    area: "Fishergate",
    dish: "Fresh pappardelle, slow-braised ragù, aged parmesan",
    saving: "2 for 1 mains",
    image: "/images/prestonblog/restaurant-italian.png",
  },
  {
    id: "fishergate-social",
    name: "Fishergate Social",
    cuisine: "Cocktails & Small Plates",
    area: "City Centre",
    dish: "Signature cocktails and sharing boards after work",
    saving: "2 for 1 cocktails",
    image: "/images/prestonblog/restaurant-cocktails.png",
    tag: "Weekends",
  },
  {
    id: "plough-harrow",
    name: "The Plough & Harrow",
    cuisine: "Gastropub",
    area: "Fulwood",
    dish: "Dry-aged smash burger, house fries, craft ale",
    saving: "40% off food",
    image: "/images/prestonblog/food-burger.png",
  },
  {
    id: "guild-house",
    name: "Guild Coffee House",
    cuisine: "Brunch & Coffee",
    area: "Avenham",
    dish: "Eggs benedict, avocado toast, weekend mimosas",
    saving: "30% off brunch",
    image: "/images/prestonblog/food-brunch.png",
    tag: "New",
  },
  {
    id: "avenham-kitchen",
    name: "The Avenham Kitchen",
    cuisine: "Date Night",
    area: "Avenham Park",
    dish: "Candlelit three courses with a glass of house fizz",
    saving: "50% off food",
    image: "/images/prestonblog/hero-dining.png",
    tag: "Popular",
  },
]
