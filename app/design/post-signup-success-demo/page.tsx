import type { Metadata } from "next"
import { PostSignupSuccessDemo } from "@/components/prototypes/eatinout-post-signup/post-signup-success-demo"

/**
 * ISOLATED DESIGN DEMO — /design/post-signup-success-demo
 *
 * What a customer sees immediately after successfully starting their EatinOut
 * 30-day free trial. Built entirely from supplied transparent PNG assets.
 * Not linked from any navigation, sitemap, signup, checkout or account
 * journey — accessible only by manually entering the URL. Indexing disabled.
 * No production signup / Stripe / auth / redirect logic is involved.
 */
export const metadata: Metadata = {
  title: "Post-signup Success Demo (internal)",
  robots: {
    index: false,
    follow: false,
  },
}

export default function PostSignupSuccessDemoPage() {
  return <PostSignupSuccessDemo />
}
