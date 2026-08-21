/**
 * Experience data for the EatinOut Lancashire landing page.
 *
 * These are EXPERIENCES (occasions), not specific restaurants or towns, so the
 * page stays relevant to everyone across Lancashire — a visitor from Blackburn
 * or Burnley sees a night out they recognise, never an unknown venue name.
 *
 * Nothing here touches production data — it is local, presentational content
 * used only by this isolated landing page.
 */

export interface Experience {
  id: string
  /** Emotional occasion title, e.g. "Friday Pizza Night" */
  title: string
  /** One-line, feeling-led description */
  blurb: string
  /** Warm, authentic dining-out lifestyle photography (people-first) */
  image: string
  /** Optional small tag */
  tag?: string
}

/** Every experience carries the same headline saving. */
export const EXPERIENCE_SAVING = "Up to 50% OFF"

/** Shown once under the grid — keeps individual cards clean. */
export const EXPERIENCE_FOOTNOTE = "Available at participating restaurants across Lancashire."

export const EXPERIENCES: Experience[] = [
  {
    id: "pizza-night",
    title: "Friday Pizza Night",
    blurb: "Round off the week with a proper pizza — for a fraction of the price.",
    image: "/images/prestonblog/moment-pizza.png",
    tag: "Most loved",
  },
  {
    id: "date-night",
    title: "Date Night",
    blurb: "Reconnect over a lovely dinner without watching the bill.",
    image: "/images/prestonblog/moment-datenight.png",
  },
  {
    id: "burger-night",
    title: "Burger Night",
    blurb: "Big burgers, crispy fries and a cold one — sorted for less.",
    image: "/images/prestonblog/moment-burger.png",
  },
  {
    id: "cocktails",
    title: "Cocktails with Friends",
    blurb: "Kick the weekend off with a round that doesn't hurt.",
    image: "/images/prestonblog/moment-cocktails.png",
  },
  {
    id: "weekend-brunch",
    title: "Weekend Brunch",
    blurb: "Lazy mornings, good coffee and brunch that costs less.",
    image: "/images/prestonblog/moment-brunch.png",
  },
  {
    id: "family-meal",
    title: "Family Meal",
    blurb: "Get everyone round the table and still spend less than staying in.",
    image: "/images/prestonblog/moment-family.png",
    tag: "Great for families",
  },
  {
    id: "steak-night",
    title: "Steak Night",
    blurb: "Treat yourselves to the good stuff and save on the bill.",
    image: "/images/prestonblog/moment-grill.png",
  },
  {
    id: "italian-night",
    title: "Italian Night",
    blurb: "Fresh pasta and a bottle of red — la dolce vita, for less.",
    image: "/images/prestonblog/moment-italian.png",
  },
  {
    id: "curry-night",
    title: "Curry Night",
    blurb: "Share a proper feast with the people you love — and pay less.",
    image: "/images/prestonblog/moment-curry.png",
  },
]
