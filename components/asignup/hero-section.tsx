"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { trackAsignupEvent } from "@/components/asignup/track"

export function HeroSection() {
    return (
        <section className="relative flex min-h-[78vh] w-full items-end justify-center overflow-hidden">
            {/* Dine-in background image */}
            <Image
                src="/images/asignup-hero-friends.png"
                alt="Friends laughing together over a table full of food at a restaurant"
                fill
                priority
                sizes="100vw"
                className="object-cover"
            />

            {/* Soft gradient overlay - keeps text readable without crushing the image to black */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.20) 40%, rgba(0,0,0,0.45) 65%, rgba(0,0,0,0.70) 85%, rgba(0,0,0,0.82) 100%)",
                }}
                aria-hidden="true"
            />

            {/* Hero content - sits low over the darker table-edge area */}
            <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center px-6 pb-12 text-center sm:max-w-2xl">
                <h1
                    className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl"
                    style={{ textShadow: "0 2px 14px rgba(0,0,0,0.55)" }}
                >
                    <span className="sm:block">Eat out for less</span>{" "}
                    <span className="sm:block">at restaurants near you</span>
                </h1>

                <p
                    className="mt-4 text-pretty text-base font-normal leading-relaxed text-white/95 sm:text-lg"
                    style={{ textShadow: "0 2px 10px rgba(0,0,0,0.55)" }}
                >
                    Save up to 50% off your total bill with local dining offers.
                </p>

                {/* Value line - subtle, not a loud badge */}
                <p
                    className="mt-3 text-sm font-medium text-white/90"
                    style={{ textShadow: "0 2px 8px rgba(0,0,0,0.55)" }}
                >
                    30 days free, then £4.99/month. Cancel anytime.
                </p>

                <div className="mt-6 flex w-full flex-col gap-3 sm:max-w-sm">
                    {/* Primary - the only red element, premium height */}
                    <Button
                        asChild
                        className="h-14 w-full rounded-full bg-[#EB221C] text-base font-semibold text-white shadow-md hover:bg-[#cf1d18]"
                    >
                        <Link
                            href="/sign-up"
                            onClick={() => trackAsignupEvent("asignup_start_trial_click")}
                        >
                            Start my 30-day free trial
                        </Link>
                    </Button>

                    {/* Secondary - quiet ghost/outline that doesn't compete */}
                    <Button
                        asChild
                        variant="outline"
                        className="h-14 w-full rounded-full border border-white/50 bg-transparent text-base font-medium text-white hover:bg-white/10 hover:text-white"
                    >
                        <Link
                            href="/restaurants"
                            onClick={() => trackAsignupEvent("asignup_view_restaurants_click")}
                        >
                            See restaurants near me
                        </Link>
                    </Button>
                </div>

                <p
                    className="mt-4 text-xs font-medium text-white/75"
                    style={{ textShadow: "0 2px 8px rgba(0,0,0,0.55)" }}
                >
                    Browse local offers before you join.
                </p>
            </div>
        </section>
    )
}
