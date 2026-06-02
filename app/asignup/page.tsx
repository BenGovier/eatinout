"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function SignupPage() {
    return (
        <div className="bg-[#FFFBF7]">
            {/* Hero Section - Image-led, mobile-first */}
            <section className="relative min-h-[85vh] flex flex-col">
                {/* Background Image */}
                <div className="absolute inset-0">
                    <Image
                        src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070"
                        alt="People dining at a restaurant"
                        fill
                        className="object-cover"
                        priority
                    />
                    {/* Warm gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/90 via-[#1C1917]/50 to-[#1C1917]/20" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-8 pt-20">
                    <div className="max-w-lg mx-auto w-full">
                        {/* Headline */}
                        <h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tight mb-3">
                            Dine Out
                        </h1>
                        
                        {/* Subheadline */}
                        <p className="text-xl sm:text-2xl text-white/90 font-medium mb-4">
                            Save when you eat out across Lancashire.
                        </p>

                        {/* Body copy */}
                        <p className="text-base text-white/80 mb-6 leading-relaxed">
                            Eatinout gives you member-only offers at local restaurants, cafés and bars. Show your offer when you visit and save in venue.
                        </p>

                        {/* Price/trial line */}
                        <p className="text-sm text-white/70 mb-6">
                            7 days free, then £4.99/month.
                        </p>

                        {/* CTA buttons */}
                        <div className="flex flex-col gap-3">
                            <Button
                                asChild
                                size="lg"
                                className="w-full bg-[#DC3545] hover:bg-[#B91C2C] text-white rounded-full text-base font-semibold py-6"
                            >
                                <Link href="/start">Start 7 days free</Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                size="lg"
                                className="w-full rounded-full text-base font-medium py-6 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white"
                            >
                                <Link href="/restaurants">Browse restaurants</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Strip - 3 simple points */}
            <section className="py-8 px-5 bg-white border-y border-[#E8E4DF]">
                <div className="max-w-lg mx-auto">
                    <div className="flex justify-between items-center text-center">
                        <div className="flex-1">
                            <p className="text-lg font-bold text-[#1C1917]">500+</p>
                            <p className="text-xs text-[#78716C]">venues</p>
                        </div>
                        <div className="w-px h-8 bg-[#E8E4DF]" />
                        <div className="flex-1">
                            <p className="text-lg font-bold text-[#1C1917]">In venue</p>
                            <p className="text-xs text-[#78716C]">use</p>
                        </div>
                        <div className="w-px h-8 bg-[#E8E4DF]" />
                        <div className="flex-1">
                            <p className="text-lg font-bold text-[#1C1917]">Cancel</p>
                            <p className="text-xs text-[#78716C]">anytime</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works - Minimal */}
            <section className="py-12 px-5 bg-[#FFFBF7]">
                <div className="max-w-lg mx-auto">
                    <h2 className="text-2xl font-bold text-[#1C1917] mb-8 text-center">
                        How it works
                    </h2>
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-[#DC3545]/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-[#DC3545] font-bold text-sm">1</span>
                            </div>
                            <div>
                                <p className="text-[#1C1917] font-medium">Join free for 7 days</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-[#DC3545]/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-[#DC3545] font-bold text-sm">2</span>
                            </div>
                            <div>
                                <p className="text-[#1C1917] font-medium">Choose a restaurant, café or bar</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-[#DC3545]/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-[#DC3545] font-bold text-sm">3</span>
                            </div>
                            <div>
                                <p className="text-[#1C1917] font-medium">Show your offer and save</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-12 px-5 bg-[#1C1917]">
                <div className="max-w-lg mx-auto text-center">
                    <h2 className="text-2xl font-bold text-white mb-6">
                        Ready to dine out for less?
                    </h2>
                    <Button
                        asChild
                        size="lg"
                        className="w-full bg-[#DC3545] hover:bg-[#B91C2C] text-white rounded-full text-base font-semibold py-6"
                    >
                        <Link href="/start">Start 7 days free</Link>
                    </Button>
                    <p className="text-sm text-white/60 mt-4">
                        7 days free, then £4.99/month. Cancel anytime.
                    </p>
                </div>
            </section>
        </div>
    )
}
