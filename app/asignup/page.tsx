"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { MapPin, Ticket, Store } from "lucide-react"

export default function SignupPage() {
    return (
        <div className="bg-[#FFFBF7]">
            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex flex-col">
                {/* Background Image */}
                <div className="absolute inset-0">
                    <Image
                        src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070"
                        alt="People dining at a restaurant"
                        fill
                        className="object-cover"
                        priority
                    />
                    {/* Stronger dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/95 via-[#1C1917]/70 to-[#1C1917]/40" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-10 pt-24">
                    <div className="max-w-2xl mx-auto w-full">
                        {/* Headline */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4 leading-tight">
                            Restaurant discounts when you eat out
                        </h1>
                        
                        {/* Subheadline */}
                        <p className="text-lg sm:text-xl text-white/90 font-medium mb-4 leading-relaxed">
                            Save at local restaurants, cafés and bars across Lancashire with member-only Eatinout offers.
                        </p>

                        {/* Explainer */}
                        <p className="text-base text-white/75 mb-4 leading-relaxed">
                            Browse participating venues, choose an offer, then show your Eatinout voucher when you visit.
                        </p>

                        {/* Price line */}
                        <p className="text-sm text-white/60 mb-6">
                            7 days free, then £4.99/month.
                        </p>

                        {/* CTA buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                asChild
                                size="lg"
                                className="w-full sm:w-auto bg-[#DC3545] hover:bg-[#B91C2C] text-white rounded-full text-base font-semibold py-6 px-8"
                            >
                                <Link href="/start">Start 7 days free</Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                size="lg"
                                className="w-full sm:w-auto rounded-full text-base font-medium py-6 px-8 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white"
                            >
                                <Link href="/restaurants">Browse restaurants</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Strip */}
            <section className="py-10 px-5 bg-white border-y border-[#E8E4DF]">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-[#1C1917]">500+ venues</p>
                            <p className="text-sm text-[#78716C] mt-1">Across Lancashire</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-[#1C1917]">Use in venue</p>
                            <p className="text-sm text-[#78716C] mt-1">Show your voucher when you visit</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-[#1C1917]">Cancel anytime</p>
                            <p className="text-sm text-[#78716C] mt-1">No long contract</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-14 px-5 bg-[#FFFBF7]">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#1C1917] mb-10 text-center">
                        How Eatinout works
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="w-14 h-14 rounded-full bg-[#DC3545]/10 flex items-center justify-center mx-auto mb-4">
                                <span className="text-[#DC3545] font-bold text-xl">1</span>
                            </div>
                            <h3 className="text-lg font-semibold text-[#1C1917] mb-2">Find a restaurant</h3>
                            <p className="text-sm text-[#78716C]">Browse member offers across Lancashire.</p>
                        </div>
                        <div className="text-center">
                            <div className="w-14 h-14 rounded-full bg-[#DC3545]/10 flex items-center justify-center mx-auto mb-4">
                                <span className="text-[#DC3545] font-bold text-xl">2</span>
                            </div>
                            <h3 className="text-lg font-semibold text-[#1C1917] mb-2">View your voucher</h3>
                            <p className="text-sm text-[#78716C]">Choose the offer you want to use.</p>
                        </div>
                        <div className="text-center">
                            <div className="w-14 h-14 rounded-full bg-[#DC3545]/10 flex items-center justify-center mx-auto mb-4">
                                <span className="text-[#DC3545] font-bold text-xl">3</span>
                            </div>
                            <h3 className="text-lg font-semibold text-[#1C1917] mb-2">Show it when you eat out</h3>
                            <p className="text-sm text-[#78716C]">Present your Eatinout voucher in venue and save.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Member-only Restaurant Discounts */}
            <section className="py-14 px-5 bg-white">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#1C1917] mb-4 text-center">
                        Member-only restaurant discounts
                    </h2>
                    <p className="text-base text-[#78716C] text-center mb-10 max-w-2xl mx-auto">
                        Eatinout gives you access to local offers at restaurants, cafés and bars — made for people who love eating out, not ordering in.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-[#FFFBF7] rounded-xl p-6 border border-[#E8E4DF]">
                            <div className="w-12 h-12 rounded-full bg-[#DC3545]/10 flex items-center justify-center mb-4">
                                <Ticket className="w-6 h-6 text-[#DC3545]" />
                            </div>
                            <h3 className="text-lg font-semibold text-[#1C1917] mb-2">Restaurant discounts</h3>
                            <p className="text-sm text-[#78716C]">Save when you eat out locally.</p>
                        </div>
                        <div className="bg-[#FFFBF7] rounded-xl p-6 border border-[#E8E4DF]">
                            <div className="w-12 h-12 rounded-full bg-[#DC3545]/10 flex items-center justify-center mb-4">
                                <MapPin className="w-6 h-6 text-[#DC3545]" />
                            </div>
                            <h3 className="text-lg font-semibold text-[#1C1917] mb-2">Local venues</h3>
                            <p className="text-sm text-[#78716C]">Discover places across Lancashire.</p>
                        </div>
                        <div className="bg-[#FFFBF7] rounded-xl p-6 border border-[#E8E4DF]">
                            <div className="w-12 h-12 rounded-full bg-[#DC3545]/10 flex items-center justify-center mb-4">
                                <Store className="w-6 h-6 text-[#DC3545]" />
                            </div>
                            <h3 className="text-lg font-semibold text-[#1C1917] mb-2">Simple vouchers</h3>
                            <p className="text-sm text-[#78716C]">Show your offer in venue.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-14 px-5 bg-[#1C1917]">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                        Ready to save when you eat out?
                    </h2>
                    <p className="text-base text-white/70 mb-8">
                        Join Eatinout and get member-only discounts at restaurants, cafés and bars across Lancashire.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                            asChild
                            size="lg"
                            className="w-full sm:w-auto bg-[#DC3545] hover:bg-[#B91C2C] text-white rounded-full text-base font-semibold py-6 px-8"
                        >
                            <Link href="/start">Start 7 days free</Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="w-full sm:w-auto rounded-full text-base font-medium py-6 px-8 border-white/30 text-white hover:bg-white/10 hover:text-white"
                        >
                            <Link href="/restaurants">Browse restaurants</Link>
                        </Button>
                    </div>
                    <p className="text-sm text-white/50 mt-6">
                        7 days free, then £4.99/month. Cancel anytime.
                    </p>
                </div>
            </section>
        </div>
    )
}
