"use client"

import { Quote, Heart, Users, Coffee, Wine, UtensilsCrossed, Calendar } from "lucide-react"

const testimonials = [
    {
        quote: "Used it once and it already paid for itself.",
        name: "Sarah",
        location: "Preston",
    },
    {
        quote: "We saved £18 on a meal out. No faff, just showed the code.",
        name: "James",
        location: "Blackpool",
    },
    {
        quote: "Great for finding somewhere local without paying full price.",
        name: "Emma",
        location: "Lytham St Annes",
    },
]

const occasions = [
    {
        icon: Heart,
        title: "Date nights",
        description: "Romantic restaurants with member savings",
    },
    {
        icon: Users,
        title: "Family meals",
        description: "Family-friendly spots for less",
    },
    {
        icon: Coffee,
        title: "Coffee stops",
        description: "Local cafes with member offers",
    },
    {
        icon: Wine,
        title: "Cocktails & bars",
        description: "Drinks deals at local bars",
    },
    {
        icon: UtensilsCrossed,
        title: "Lunch out",
        description: "Midday meals with offers",
    },
    {
        icon: Calendar,
        title: "Weekend plans",
        description: "Save on your weekend spots",
    },
]

export function SocialProof() {
    return (
        <>
            {/* Built for going out section */}
            <section className="py-12 md:py-16 bg-[#1C1917]">
                <div className="mx-auto max-w-7xl px-4 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 px-4 py-1.5 rounded-full text-xs font-medium mb-5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#DC3545]"></span>
                            Not delivery. Not takeaway.
                        </div>
                        <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 text-balance">
                            Built for going out, not ordering in
                        </h2>
                        <p className="text-base md:text-lg text-[#A8A29E] leading-relaxed text-pretty">
                            Find a local restaurant, cafe or bar, show your Eatinout member offer when you visit, and save when you eat out.
                        </p>
                    </div>
                </div>
            </section>

            {/* Ways to use Eatinout */}
            <section className="py-12 md:py-20 bg-[#FAF9F7]">
                <div className="mx-auto max-w-7xl px-4 lg:px-8">
                    <div className="text-center mb-10 md:mb-12">
                        <h2 className="text-2xl md:text-4xl font-bold text-[#1C1917] mb-3">
                            Ways to use your membership
                        </h2>
                        <p className="text-sm md:text-base text-[#57534E]">
                            Your Eatinout membership works for any occasion
                        </p>
                    </div>

                    {/* Occasion cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-12 md:mb-16">
                        {occasions.map((occasion, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-2xl p-4 md:p-5 border border-[#E8E4DF] hover:shadow-md hover:border-[#DC3545]/20 transition-all duration-200 cursor-default"
                            >
                                <div className="flex flex-col items-center text-center gap-2.5">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#DC3545]/10 flex items-center justify-center">
                                        <occasion.icon className="h-5 w-5 md:h-6 md:w-6 text-[#DC3545]" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[#1C1917] text-sm md:text-base">
                                            {occasion.title}
                                        </h3>
                                        <p className="text-xs text-[#78716C] mt-0.5 hidden md:block">
                                            {occasion.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Testimonials */}
                    <div className="border-t border-[#E8E4DF] pt-10 md:pt-14">
                        <p className="text-center text-sm font-medium text-[#78716C] uppercase tracking-wider mb-6 md:mb-8">
                            Loved by members who eat out
                        </p>
                        <div className="grid gap-4 md:gap-6 md:grid-cols-3 max-w-4xl mx-auto">
                            {testimonials.map((testimonial, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-[#E8E4DF]"
                                >
                                    <Quote className="h-5 w-5 text-[#DC3545]/30 mb-3" />
                                    <p className="text-sm md:text-base text-[#1C1917] font-medium mb-3 text-pretty">
                                        &ldquo;{testimonial.quote}&rdquo;
                                    </p>
                                    <p className="text-xs md:text-sm text-[#78716C]">
                                        {testimonial.name}, {testimonial.location}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}
