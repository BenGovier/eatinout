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

      <div className="relative mx-auto flex w-full max-w-[440px] flex-col items-center px-4 py-8 sm:px-5 md:max-w-[600px]">
        {/* 1 — success celebration */}
        <Reveal mode="load" y={8} scale={0.98} duration={0.5} className="w-full max-w-[520px]">
          <Image
            src={`${ASSET}/01_success_celebration.png`}
            alt="EatinOut free trial successfully activated."
            width={1122}
            height={1402}
            priority
            sizes="(max-width: 640px) 100vw, 520px"
            className="h-auto w-full select-none"
          />
        </Reveal>

        {/* 2 — app showcase hero (visually dominant, allowed to bleed slightly) */}
        <Reveal
          mode="view"
          y={14}
          scale={0.985}
          duration={0.6}
          className="mt-2.5 w-[108%] max-w-[680px]"
        >
          <Image
            src={`${ASSET}/02_app_showcase_hero.png`}
            alt="Preview of the EatinOut app showing restaurant discounts."
            width={1122}
            height={1402}
            priority
            sizes="(max-width: 640px) 108vw, 680px"
            className="h-auto w-full select-none"
          />
        </Reveal>

        {/* 3 — benefits strip (allowed to bleed slightly so text stays readable) */}
        <Reveal
          mode="view"
          y={8}
          duration={0.45}
          className="mt-2.5 w-[108%] max-w-[560px]"
        >
          <Image
            src={`${ASSET}/03_benefits_strip.png`}
            alt="Browse restaurants, generate discount codes and save up to 50%."
            width={1983}
            height={793}
            sizes="(max-width: 640px) 108vw, 560px"
            className="h-auto w-full select-none"
          />
        </Reveal>

        {/* section transition copy */}
        <Reveal mode="view" y={8} duration={0.45} className="mt-7 w-full text-center">
          <h2 className="text-[24px] font-extrabold" style={{ color: "#191715", letterSpacing: "-0.02em" }}>
            Take EatinOut with you
          </h2>
          <p className="mx-auto mt-2 max-w-[22rem] text-[15px]" style={{ color: "#625D58", lineHeight: 1.5 }}>
            Your membership is ready. Download the app and start finding places to save.
          </p>
        </Reveal>

        {/* 4 — app download panel (PRIMARY next action) */}
        <Reveal mode="view" y={10} duration={0.5} className="mt-5 w-full max-w-[560px]">
          <div className="transition-transform duration-200 md:hover:scale-[1.003]">
            <ImageWithHotspots
              src={`${ASSET}/04_app_download_panel.png`}
              alt="Download EatinOut from the App Store or Google Play."
              width={1619}
              height={971}
              sizes="(max-width: 640px) 100vw, 560px"
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
        <Reveal mode="view" y={6} duration={0.35} className="mt-4 w-full max-w-[560px]">
          <Image
            src={`${ASSET}/05_membership_active_banner.png`}
            alt="Membership active with no charge today."
            width={2172}
            height={724}
            sizes="(max-width: 640px) 100vw, 560px"
            className="h-auto w-full select-none"
          />
        </Reveal>
      </div>
    </main>
  )
}
