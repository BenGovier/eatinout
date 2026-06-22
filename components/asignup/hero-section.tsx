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
                        "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.8) 80%, rgba(0,0,0,0.94) 100%)",
                }}
                aria-hidden="true"
            />

            {/* Hero content - sits low over the darker table-edge area */}
            <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center px-6 pb-10 text-center">
                <h1
                    className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl"
                    style={{ textShadow: "0 3px 12px rgba(0,0,0,0.6)" }}
                >
                    Eat out for less at restaurants near you
                </h1>

                <p
                    className="mt-4 text-pretty text-base font-medium leading-snug text-white sm:text-xl"
                    style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
                >
                    Save up to 50% off your total bill. Start with 30 days free, then just £4.99/month.
                </p>

                <p
                    className="mt-2 text-sm font-medium text-white/90"
                    style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
                >
                    Browse local offers before you join.
                </p>

                <div className="mt-7 flex w-full flex-col gap-3 sm:max-w-md">
                    {/* Primary - dominant EatinOut red */}
                    <Button
                        asChild
                        size="lg"
                        className="w-full rounded-full bg-[#EB221C] py-6 text-base font-bold text-white shadow-lg hover:bg-[#cf1d18]"
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
                        className="w-full rounded-full border-2 border-white bg-white/10 py-6 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
                    >
                        <Link
                            href="/restaurants"
                            onClick={() => trackAsignupEvent("asignup_view_restaurants_click")}
                        >
                            See restaurants near me
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
