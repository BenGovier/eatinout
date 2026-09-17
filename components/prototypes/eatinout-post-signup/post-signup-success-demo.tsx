"use client"

import Image from "next/image"
import { useState } from "react"
import { Reveal } from "./reveal"
import { ImageWithHotspots, type Hotspot } from "./image-hotspot"

/**
 * ISOLATED DESIGN DEMO — post-signup success screen.
 *
 * The five supplied TIGHT transparent PNGs ARE the design. Their canvas is
 * already cropped, so wrappers add NO padding, cards, backgrounds or fixed
 * heights — only responsive sizing, controlled (intentionally negative)
 * margins, animation and download hotspots. The whole thing is tuned to read
 * as one poster within ~one mobile viewport. No production
 * signup/Stripe/auth/redirect logic is touched.
 */

// Reused from the existing repository (components/asignup/footer.tsx).
const APP_STORE_URL = "https://apps.apple.com/app/eatinout"
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.eatinout"

const ASSET = "/design/post-signup-success"

export function PostSignupSuccessDemo() {
  const [webNotice, setWebNotice] = useState(false)

  // Percentages relative to the download panel image (intrinsic 1378x909),
  // derived by scanning the actual pixels of the tight asset.
  const downloadHotspots: Hotspot[] = [
    {
      id: "app-store",
      label: "Download EatinOut on the App Store",
      top: 46,
      left: 7,
      width: 42,
      height: 17,
      href: APP_STORE_URL,
    },
    {
      id: "google-play",
      label: "Get EatinOut on Google Play",
      top: 46,
      left: 51,
      width: 42,
      height: 17,
      href: GOOGLE_PLAY_URL,
    },
    {
      id: "continue-web",
      label: "Continue using EatinOut on the web",
      top: 74,
      left: 7,
      width: 86,
      height: 15,
      onClick: () => setWebNotice(true),
    },
  ]

  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden" style={{ backgroundColor: "#F7F3EF" }}>
      {/* barely-visible warm depth (no layout footprint) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 12%, rgba(217,4,41,0.04), transparent 30%), radial-gradient(circle at 12% 60%, rgba(194,140,50,0.025), transparent 28%)",
        }}
      />

      {/* Single mobile-card column. No gap; each item controls its own margins. */}
      <div
        className="relative mx-auto flex w-full flex-col items-center"
        style={{
          maxWidth: 440,
          paddingLeft: 10,
          paddingRight: 10,
          paddingTop: 4,
          paddingBottom: 12,
        }}
      >
        {/* 1 — success celebration */}
        <Reveal mode="load" duration={0.35} className="w-full" style={{ width: 330, maxWidth: "78vw", marginBottom: -105 }}>
          <Image
            src={`${ASSET}/01_success_celebration.png`}
            alt="EatinOut free trial successfully activated."
            width={1118}
            height={1353}
            priority
            sizes="(max-width: 440px) 78vw, 330px"
            className="block h-auto w-full select-none"
          />
        </Reveal>

        {/* 2 — app showcase (tucks under "You're in!") */}
        <Reveal
          mode="load"
          y={8}
          duration={0.45}
          delay={0.05}
          className="relative z-[1]"
          style={{ width: 300, maxWidth: "72vw", marginBottom: -82 }}
        >
          <Image
            src={`${ASSET}/02_app_showcase_hero.png`}
            alt="Preview of the EatinOut app showing restaurant discounts."
            width={1111}
            height={1256}
            priority
            sizes="(max-width: 440px) 72vw, 300px"
            className="block h-auto w-full select-none"
          />
        </Reveal>

        {/* 3 — benefits strip (immediately below the phone) */}
        <Reveal mode="load" duration={0.3} delay={0.1} style={{ width: 355, maxWidth: "86vw", marginBottom: 8 }}>
          <Image
            src={`${ASSET}/03_benefits_strip.png`}
            alt="Browse restaurants, generate discount codes and save up to 50%."
            width={1720}
            height={713}
            sizes="(max-width: 440px) 86vw, 355px"
            className="block h-auto w-full select-none"
          />
        </Reveal>

        {/* 4 — app download panel (PRIMARY next action) */}
        <Reveal
          mode="load"
          y={6}
          duration={0.35}
          delay={0.12}
          style={{ width: 365, maxWidth: "88vw", marginBottom: 4 }}
        >
          <ImageWithHotspots
            src={`${ASSET}/04_app_download_panel.png`}
            alt="Download EatinOut from the App Store or Google Play."
            width={1378}
            height={909}
            priority
            sizes="(max-width: 440px) 88vw, 365px"
            hotspots={downloadHotspots}
          />
          {webNotice ? (
            <p role="status" aria-live="polite" className="mt-2 text-center text-[13px] font-medium" style={{ color: "#817A74" }}>
              Demo only — web destination not connected.
            </p>
          ) : null}
        </Reveal>

        {/* 5 — membership active banner (reassurance only) */}
        <Reveal mode="load" duration={0.25} delay={0.15} style={{ width: 350, maxWidth: "84vw", marginTop: 2, marginBottom: 4 }}>
          <Image
            src={`${ASSET}/05_membership_active_banner.png`}
            alt="Membership active with no charge today."
            width={1979}
            height={279}
            sizes="(max-width: 440px) 84vw, 350px"
            className="block h-auto w-full select-none"
          />
        </Reveal>
      </div>
    </main>
  )
}
