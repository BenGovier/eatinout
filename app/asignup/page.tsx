"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { MapPin, Ticket, Percent, XCircle, Check, ChevronDown, Utensils } from "lucide-react"

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
                            30 days free, then £4.99/month.
                        </p>

                        {/* CTA buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                asChild
                                size="lg"
                                className="w-full sm:w-auto bg-[#DC3545] hover:bg-[#B91C2C] text-white rounded-full text-base font-semibold py-6 px-8 shadow-lg shadow-[#DC3545]/25"
                            >
                                <Link href="/start">Start 30 days free</Link>
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

            {/* How Your Eatinout Voucher Works - Premium Mobile-First Journey */}
            <section className="py-16 sm:py-20 px-5 bg-gradient-to-b from-[#FFFBF7] to-white">
                <div className="max-w-4xl mx-auto">
                    {/* Section Header */}
                    <div className="text-center mb-12 sm:mb-16">
                        <div className="inline-flex items-center gap-2 bg-[#DC3545]/10 text-[#DC3545] px-4 py-2 rounded-full text-sm font-semibold mb-4">
                            <Ticket className="w-4 h-4" />
                            Simple voucher system
                        </div>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1C1917] mb-4">
                            How your Eatinout voucher works
                        </h2>
                        <p className="text-base sm:text-lg text-[#78716C] max-w-xl mx-auto">
                            Choose a restaurant offer, show your voucher when you visit, and save when you eat out.
                        </p>
                    </div>
                    
                    {/* Mobile-First Vertical Journey */}
                    <div className="max-w-md mx-auto sm:max-w-none">
                        {/* Steps Container */}
                        <div className="flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-4">
                            
                            {/* Step 1 - Choose an offer */}
                            <div className="flex-1 relative">
                                {/* Mobile connector arrow */}
                                <div className="sm:hidden absolute left-1/2 -bottom-6 transform -translate-x-1/2 z-10">
                                    <div className="w-8 h-8 rounded-full bg-[#DC3545] flex items-center justify-center shadow-lg">
                                        <ChevronDown className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                
                                {/* Card */}
                                <div className="relative bg-gradient-to-br from-white to-[#FFFBF7] rounded-3xl p-6 shadow-xl shadow-[#1C1917]/5 border border-[#E8E4DF]">
                                    {/* Step badge */}
                                    <div className="absolute -top-3 left-6 bg-[#DC3545] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                        STEP 1
                                    </div>
                                    
                                    <div className="pt-4">
                                        <h3 className="text-xl font-bold text-[#1C1917] mb-2">Choose an offer</h3>
                                        <p className="text-sm text-[#78716C] mb-5">Browse restaurant discounts across Lancashire.</p>
                                        
                                        {/* Mini offer card visual */}
                                        <div className="bg-[#1C1917] rounded-2xl p-4 shadow-lg">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-12 h-12 rounded-xl bg-[#DC3545]/20 flex items-center justify-center">
                                                    <Utensils className="w-6 h-6 text-[#DC3545]" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold text-sm">The Italian Kitchen</p>
                                                    <p className="text-white/60 text-xs">Preston, Lancashire</p>
                                                </div>
                                            </div>
                                            <div className="inline-flex items-center gap-1.5 bg-[#DC3545] text-white text-sm font-bold px-3 py-1.5 rounded-lg">
                                                <Percent className="w-3.5 h-3.5" />
                                                Up to 50% off
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Desktop connector */}
                            <div className="hidden sm:flex items-center justify-center self-center">
                                <div className="w-8 h-0.5 bg-gradient-to-r from-[#DC3545]/30 to-[#DC3545]" />
                                <div className="w-3 h-3 rounded-full bg-[#DC3545]" />
                                <div className="w-8 h-0.5 bg-gradient-to-r from-[#DC3545] to-[#DC3545]/30" />
                            </div>
                            
                            {/* Step 2 - Get your voucher code */}
                            <div className="flex-1 relative">
                                {/* Mobile connector arrow */}
                                <div className="sm:hidden absolute left-1/2 -bottom-6 transform -translate-x-1/2 z-10">
                                    <div className="w-8 h-8 rounded-full bg-[#DC3545] flex items-center justify-center shadow-lg">
                                        <ChevronDown className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                
                                {/* Card - Highlighted as the key step */}
                                <div className="relative bg-gradient-to-br from-[#DC3545] to-[#B91C2C] rounded-3xl p-6 shadow-xl shadow-[#DC3545]/20 border-2 border-[#DC3545]">
                                    {/* Step badge */}
                                    <div className="absolute -top-3 left-6 bg-white text-[#DC3545] text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                        STEP 2
                                    </div>
                                    
                                    <div className="pt-4">
                                        <h3 className="text-xl font-bold text-white mb-2">Get your voucher code</h3>
                                        <p className="text-sm text-white/80 mb-5">Open your Eatinout voucher before you visit.</p>
                                        
                                        {/* Voucher code visual */}
                                        <div className="bg-white rounded-2xl p-5 shadow-lg">
                                            <div className="text-center">
                                                <p className="text-[#78716C] text-xs font-medium uppercase tracking-wider mb-2">Your Eatinout Code</p>
                                                <div className="bg-[#FFFBF7] border-2 border-dashed border-[#DC3545]/30 rounded-xl py-4 px-6 mb-3">
                                                    <p className="text-3xl font-mono font-bold text-[#1C1917] tracking-widest">SAVE50</p>
                                                </div>
                                                <p className="text-xs text-[#78716C]">Show this code at the restaurant</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Desktop connector */}
                            <div className="hidden sm:flex items-center justify-center self-center">
                                <div className="w-8 h-0.5 bg-gradient-to-r from-[#DC3545]/30 to-[#DC3545]" />
                                <div className="w-3 h-3 rounded-full bg-[#DC3545]" />
                                <div className="w-8 h-0.5 bg-gradient-to-r from-[#DC3545] to-[#DC3545]/30" />
                            </div>
                            
                            {/* Step 3 - Show it in venue */}
                            <div className="flex-1 relative">
                                {/* Card */}
                                <div className="relative bg-gradient-to-br from-white to-[#FFFBF7] rounded-3xl p-6 shadow-xl shadow-[#1C1917]/5 border border-[#E8E4DF]">
                                    {/* Step badge */}
                                    <div className="absolute -top-3 left-6 bg-[#DC3545] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                        STEP 3
                                    </div>
                                    
                                    <div className="pt-4">
                                        <h3 className="text-xl font-bold text-[#1C1917] mb-2">Show it in venue</h3>
                                        <p className="text-sm text-[#78716C] mb-5">Show your voucher at the restaurant and enjoy your discount.</p>
                                        
                                        {/* Success visual */}
                                        <div className="bg-gradient-to-br from-[#22C55E]/10 to-[#22C55E]/5 border border-[#22C55E]/30 rounded-2xl p-5">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-[#22C55E] flex items-center justify-center shadow-lg">
                                                    <Check className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-[#1C1917] font-bold">Voucher accepted</p>
                                                    <p className="text-[#22C55E] text-sm font-medium">Save when you eat out</p>
                                                </div>
                                            </div>
                                            <div className="bg-white/80 rounded-lg p-3 text-center">
                                                <p className="text-xs text-[#78716C]">Discount applied to your bill</p>
                                                <p className="text-lg font-bold text-[#DC3545]">Up to 50% off</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Mini proof band */}
                    <div className="mt-12 sm:mt-16 bg-gradient-to-r from-[#1C1917] to-[#292524] rounded-2xl p-6 sm:p-8">
                        <p className="text-center text-lg sm:text-xl font-bold text-white mb-4">
                            Up to 50% off at restaurants, cafés and bars across Lancashire
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full border border-white/20">
                                <MapPin className="w-4 h-4 text-[#DC3545]" />
                                500+ venues
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full border border-white/20">
                                <Ticket className="w-4 h-4 text-[#DC3545]" />
                                Use in venue
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full border border-white/20">
                                <Percent className="w-4 h-4 text-[#DC3545]" />
                                30 days free
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Offer Band - Before final CTA */}
            <section className="py-10 px-5 bg-gradient-to-r from-[#DC3545] via-[#B91C2C] to-[#DC3545]">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-3xl sm:text-4xl font-bold text-white mb-3">
                        30 days free, then £4.99/month
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
                            <Link href="/start">Start 30 days free</Link>
                        </Button>
                        <Button
                            asChild
                            size="lg"
                            className="w-full sm:w-auto rounded-full text-base font-medium py-6 px-8 bg-white/10 backdrop-blur-sm border border-white/30 text-white hover:bg-white/20 hover:text-white"
                        >
                            <Link href="/restaurants">Browse restaurants</Link>
                        </Button>
                    </div>
                    <p className="text-sm text-white/50 mt-6">
                        30 days free, then £4.99/month. Cancel anytime.
                    </p>
                </div>
            </section>
        </div>
    )
}
