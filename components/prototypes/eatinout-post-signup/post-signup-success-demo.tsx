"use client"

import Image from "next/image"
import { useState } from "react"
import { Reveal } from "./reveal"
import { ImageWithHotspots, type Hotspot } from "./image-hotspot"

/**
 * ISOLATED DESIGN DEMO — post-signup success screen.
 *
 * The five supplied transparent PNGs ARE the design. This component only
 * places, scales, spaces and animates them, and overlays invisible hit areas
 * on the download panel. No production signup/Stripe/auth/redirect logic is
 * touched.
 */

// Reused from the existing repository (components/asignup/footer.tsx).
const APP_STORE_URL = "https://apps.apple.com/app/eatinout"
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.eatinout"

const ASSET = "/design/post-signup-success"

export function PostSignupSuccessDemo() {
  const [webNotice, setWebNotice] = useState(false)

  const downloadHotspots: Hotspot[] = [
    {
      id: "app-store",
      label: "Download EatinOut on the App Store",
      top: 44,
      left: 13,
      width: 35,
      height: 18,
      href: APP_STORE_URL,
    },
    {
      id: "google-play",
      label: "Get EatinOut on Google Play",
      top: 44,
      left: 52,
      width: 35,
      height: 18,
      href: GOOGLE_PLAY_URL,
    },
    {
      id: "continue-web",
      label: "Continue using EatinOut on the web",
      top: 69,
      left: 13,
      width: 74,
      height: 16,
      onClick: () => setWebNotice(true),
    },
  ]

  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden" style={{ backgroundColor: "#F7F3EF" }}>
      {/* barely-visible warm depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 15%, rgba(217,4,41,0.04), transparent 32%), radial-gradient(circle at 10% 65%, rgba(194,140,50,0.025), transparent 30%)",
        }}
      />

      <div
        className="relative mx-auto flex w-full max-w-[440px] flex-col items-center md:max-w-[600px]"
        style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 12, paddingBottom: 20 }}
      >
        {/* 1 — success celebration (compact, no tall wrapper) */}
        <Reveal mode="load" y={8} scale={0.98} duration={0.5} className="w-[92%] max-w-[400px]">
          <Image
            src={`${ASSET}/01_success_celebration.png`}
            alt="EatinOut free trial successfully activated."
            width={1122}
            height={1402}
            priority
            sizes="(max-width: 640px) 92vw, 400px"
            className="block h-auto w-full select-none"
          />
        </Reveal>

        {/* 2 — app showcase hero (overlaps into celebration + benefits) */}
        <Reveal
          mode="view"
          y={14}
          scale={0.985}
          duration={0.6}
          className="relative z-[1] w-[88%] max-w-[390px]"
          style={{ marginTop: -30, marginBottom: -35 }}
        >
          <Image
            src={`${ASSET}/02_app_showcase_hero.png`}
            alt="Preview of the EatinOut app showing restaurant discounts."
            width={1122}
            height={1402}
            priority
            sizes="(max-width: 640px) 88vw, 390px"
            className="block h-auto w-full select-none"
          />
        </Reveal>

        {/* 3 — benefits strip (pulled up close to the phone) */}
        <Reveal
          mode="view"
          y={8}
          duration={0.45}
          className="w-[94%] max-w-[405px]"
          style={{ marginTop: -20, marginBottom: 18 }}
        >
          <Image
            src={`${ASSET}/03_benefits_strip.png`}
            alt="Browse restaurants, generate discount codes and save up to 50%."
            width={1983}
            height={793}
            sizes="(max-width: 640px) 94vw, 405px"
            className="block h-auto w-full select-none"
          />
        </Reveal>

        {/* 4 — app download panel (PRIMARY next action, immediately after benefits) */}
        <Reveal mode="view" y={10} duration={0.5} className="w-[96%] max-w-[420px]" style={{ marginTop: 8 }}>
          <div className="transition-transform duration-200 md:hover:scale-[1.003]">
            <ImageWithHotspots
              src={`${ASSET}/04_app_download_panel.png`}
              alt="Download EatinOut from the App Store or Google Play."
              width={1619}
              height={971}
              sizes="(max-width: 640px) 96vw, 420px"
              hotspots={downloadHotspots}
            />
          </div>
          {webNotice ? (
            <p role="status" aria-live="polite" className="mt-3 text-center text-[13px] font-medium" style={{ color: "#817A74" }}>
              Demo only — web destination not connected.
            </p>
          ) : null}
        </Reveal>

        {/* 5 — membership active banner (final reassurance) */}
        <Reveal mode="view" y={6} duration={0.35} className="w-[92%] max-w-[400px]" style={{ marginTop: 12 }}>
          <Image
            src={`${ASSET}/05_membership_active_banner.png`}
            alt="Membership active with no charge today."
            width={2172}
            height={724}
            sizes="(max-width: 640px) 92vw, 400px"
            className="block h-auto w-full select-none"
          />
        </Reveal>
      </div>
    </main>
  )
}
