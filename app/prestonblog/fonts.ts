import { Playfair_Display } from "next/font/google"

/**
 * Editorial display serif, scoped ONLY to the /prestonblog landing page.
 * Loaded here (server module) and applied via `displayFont.className` on
 * headings. This does not touch the global root layout or app-wide fonts.
 */
export const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
})
