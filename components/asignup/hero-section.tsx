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

            {/* Darker gradient overlay so the offer stays readable on mobile and desktop */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.4) 35%, rgba(0,0,0,0.65) 58%, rgba(0,0,0,0.85) 78%, rgba(0,0,0,0.96) 100%)",
                }}
                aria-hidden="true"
            />

            {/* Hero content - sits low over the darker table-edge area */}
            <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center px-6 pb-12 text-center">
                <h1
                    className="text-balance text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl"
                    style={{ textShadow: "0 3px 16px rgba(0,0,0,0.7)" }}
                >
                    Eat out for less at restaurants near you
                </h1>

                <p
                    className="mt-5 text-pretty text-xl font-semibold leading-snug text-white sm:text-2xl"
                    style={{ textShadow: "0 2px 10px rgba(0,0,0,0.7)" }}
                >
                    Save up to 50% off your total bill
                </p>

                {/* Prominent offer badge */}
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#EB221C] px-5 py-2.5 shadow-lg">
                    <span className="text-base font-bold text-white sm:text-lg">
                        30 days free, then £4.99/month
                    </span>
                </div>

                <div className="mt-7 flex w-full flex-col gap-3 sm:max-w-md">
                    {/* Primary - dominant EatinOut red */}
                    <Button
                        asChild
                        size="lg"
                        className="h-auto w-full rounded-full bg-[#EB221C] py-7 text-lg font-bold text-white shadow-xl hover:bg-[#cf1d18]"
                    >
                        <Link
                            href="/sign-up"
                            onClick={() => trackAsignupEvent("asignup_start_trial_click")}
                        >
                            Start my 30-day free trial
                        </Link>
                    </Button>

                    {/* Secondary - lower friction but still obvious */}
                    <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="h-auto w-full rounded-full border-2 border-white bg-white/10 py-5 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
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
                    className="mt-4 text-sm font-medium text-white/85"
                    style={{ textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}
                >
                    Browse local offers before you join.
                </p>
            </div>
        </section>
    )
}
