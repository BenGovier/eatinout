import type { Metadata, Viewport } from "next"
import OnePoundCampaign from "@/components/campaigns/one-pound/OnePoundCampaign"

export const metadata: Metadata = {
  title: "£1 First Month | EatinOut × WTF Giveaways",
  description:
    "First month of EatinOut Premium for £1, then £4.99/month. One complimentary partner draw entry, subject to terms.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#e3262f",
  viewportFit: "cover",
}

export default function OnePoundPage() {
  return <OnePoundCampaign />
}
