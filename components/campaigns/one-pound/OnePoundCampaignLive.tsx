"use client"

import OnePoundCampaign from "@/components/campaigns/one-pound/OnePoundCampaign"
import { ONE_POUND_JOIN_PATH } from "@/lib/one-pound-campaign"

export default function OnePoundCampaignLive() {
  return <OnePoundCampaign onCheckoutRequested={() => window.location.assign(ONE_POUND_JOIN_PATH)} />
}
