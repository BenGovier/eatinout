"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { MapPin, Ticket, Percent, Users, XCircle } from "lucide-react"

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
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/95 via-[#1C1917]/70 to-[#1C1917]/40" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-10 pt-24">
                    <div className="max-w-2xl mx-auto w-full">
                        {/* Discount badge */}
                        <div className="inline-flex items-center gap-2 bg-[#DC3545] text-white px-4 py-2 rounded-full text-sm font-semibold mb-5 shadow-lg">
                            <Percent className="w-4 h-4" />
                            Member-only discounts
                        </div>

                        {/* Headline with 50% off prominent */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4 leading-tight">
                            <span className="text-[#DC3545]">Up to 50% off</span> when you eat out
                        </h1>
                        
                        {/* Subheadline */}
                        <p className="text-lg sm:text-xl text-white/90 font-medium mb-4 leading-relaxed">
                            Get member-only restaurant discounts across Lancashire with Eatinout.
                        </p>

                        {/* Explainer */}
                        <p className="text-base text-white/75 mb-4 leading-relaxed">
                            Browse local restaurants, cafés and bars, choose your offer, then show your Eatinout voucher when you visit.
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
                                className="w-full sm:w-auto bg-[#DC3545] hover:bg-[#B91C2C] text-white rounded-full text-base font-semibold py-6 px-8 shadow-lg shadow-[#DC3545]/25"
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

            {/* Trust Strip - Stronger visual design */}
            <section className="py-8 px-5 bg-gradient-to-b from-[#1C1917] to-[#292524]">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                        <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="w-10 h-10 rounded-full bg-[#DC3545] flex items-center justify-center mx-auto mb-3">
                                <Percent className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-lg font-bold text-white">Up to 50% off</p>
                            <p className="text-xs text-white/60 mt-1">Restaurant discounts</p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="w-10 h-10 rounded-full bg-[#DC3545] flex items-center justify-center mx-auto mb-3">
                                <MapPin className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-lg font-bold text-white">500+ venues</p>
                            <p className="text-xs text-white/60 mt-1">Across Lancashire</p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="w-10 h-10 rounded-full bg-[#DC3545] flex items-center justify-center mx-auto mb-3">
                                <Ticket className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-lg font-bold text-white">Use in venue</p>
                            <p className="text-xs text-white/60 mt-1">Show your voucher</p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="w-10 h-10 rounded-full bg-[#DC3545] flex items-center justify-center mx-auto mb-3">
                                <XCircle className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-lg font-bold text-white">Cancel anytime</p>
                            <p className="text-xs text-white/60 mt-1">No long contract</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works - Premium app flow design */}
            <section className="py-16 px-5 bg-[#FFFBF7]">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl font-bold text-[#1C1917] mb-3">
                            How Eatinout works
                        </h2>
                        <p className="text-base text-[#78716C]">
                            Three simple steps to start saving
                        </p>
                    </div>
                    
                    {/* Steps with connected flow */}
                    <div className="relative">
                        {/* Connector line - hidden on mobile */}
                        <div className="hidden sm:block absolute top-[60px] left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-[#DC3545]/20 via-[#DC3545] to-[#DC3545]/20" />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
                            <div className="relative">
                                <div className="bg-white rounded-2xl p-6 shadow-lg shadow-[#1C1917]/5 border border-[#E8E4DF] hover:shadow-xl hover:border-[#DC3545]/20 transition-all duration-300">
                                    <div className="w-14 h-14 rounded-full bg-[#DC3545] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#DC3545]/25 relative z-10">
                                        <span className="text-white font-bold text-xl">1</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-[#1C1917] mb-2 text-center">Find an offer</h3>
                                    <p className="text-sm text-[#78716C] text-center leading-relaxed">Browse restaurant discounts near you.</p>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="bg-white rounded-2xl p-6 shadow-lg shadow-[#1C1917]/5 border border-[#E8E4DF] hover:shadow-xl hover:border-[#DC3545]/20 transition-all duration-300">
                                    <div className="w-14 h-14 rounded-full bg-[#DC3545] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#DC3545]/25 relative z-10">
                                        <span className="text-white font-bold text-xl">2</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-[#1C1917] mb-2 text-center">View your voucher</h3>
                                    <p className="text-sm text-[#78716C] text-center leading-relaxed">Choose the offer you want to use.</p>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="bg-white rounded-2xl p-6 shadow-lg shadow-[#1C1917]/5 border border-[#E8E4DF] hover:shadow-xl hover:border-[#DC3545]/20 transition-all duration-300">
                                    <div className="w-14 h-14 rounded-full bg-[#DC3545] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#DC3545]/25 relative z-10">
                                        <span className="text-white font-bold text-xl">3</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-[#1C1917] mb-2 text-center">Eat out and save</h3>
                                    <p className="text-sm text-[#78716C] text-center leading-relaxed">Show your voucher in venue and enjoy the discount.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Member-only Restaurant Discounts - Richer cards */}
            <section className="py-16 px-5 bg-white">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl font-bold text-[#1C1917] mb-3">
                            Restaurant discounts made for eating out
                        </h2>
                        <p className="text-base text-[#78716C] max-w-2xl mx-auto">
                            Save up to 50% at local restaurants, cafés and bars — without ordering takeaway or using delivery apps.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {/* Card 1 - Up to 50% off */}
                        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#DC3545] to-[#B91C2C] p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Percent className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Up to 50% off</h3>
                                <p className="text-sm text-white/80 leading-relaxed">Access member-only discounts when you eat out.</p>
                            </div>
                        </div>
                        
                        {/* Card 2 - 500+ venues */}
                        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FEF3F2] to-[#FECACA]/30 p-6 border border-[#DC3545]/20 shadow-lg hover:shadow-xl hover:border-[#DC3545]/40 transition-all duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#DC3545]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-[#DC3545]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Users className="w-6 h-6 text-[#DC3545]" />
                                </div>
                                <h3 className="text-xl font-bold text-[#1C1917] mb-2">500+ venues</h3>
                                <p className="text-sm text-[#78716C] leading-relaxed">Discover local offers across Lancashire.</p>
                            </div>
                        </div>
                        
                        {/* Card 3 - Simple vouchers */}
                        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FEF3F2] to-[#FECACA]/30 p-6 border border-[#DC3545]/20 shadow-lg hover:shadow-xl hover:border-[#DC3545]/40 transition-all duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#DC3545]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-[#DC3545]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Ticket className="w-6 h-6 text-[#DC3545]" />
                                </div>
                                <h3 className="text-xl font-bold text-[#1C1917] mb-2">Simple vouchers</h3>
                                <p className="text-sm text-[#78716C] leading-relaxed">Show your Eatinout voucher in venue and save.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Offer Band - Before final CTA */}
            <section className="py-10 px-5 bg-gradient-to-r from-[#DC3545] via-[#B91C2C] to-[#DC3545]">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-3xl sm:text-4xl font-bold text-white mb-3">
                        7 days free, then £4.99/month
                    </p>
                    <p className="text-base text-white/80 mb-6">
                        Use Eatinout to save at restaurants, cafés and bars across Lancashire.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full border border-white/30">
                            <Percent className="w-4 h-4" />
                            Up to 50% off
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full border border-white/30">
                            <MapPin className="w-4 h-4" />
                            500+ venues
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full border border-white/30">
                            <XCircle className="w-4 h-4" />
                            Cancel anytime
                        </span>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-16 px-5 bg-[#1C1917]">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Start saving when you eat out
                    </h2>
                    <p className="text-base text-white/70 mb-8 leading-relaxed">
                        Join Eatinout today and unlock member-only restaurant discounts across Lancashire.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                            asChild
                            size="lg"
                            className="w-full sm:w-auto bg-[#DC3545] hover:bg-[#B91C2C] text-white rounded-full text-base font-semibold py-6 px-8 shadow-lg shadow-[#DC3545]/25"
                        >
                            <Link href="/start">Start 7 days free</Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="w-full sm:w-auto rounded-full text-base font-medium py-6 px-8 bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
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
