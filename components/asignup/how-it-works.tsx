import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserPlus, Search, Smartphone } from "lucide-react"

const steps = [
    {
        icon: UserPlus,
        step: "1",
        title: "Join free for 7 days",
        description: "Try Eatinout with full access before paying.",
    },
    {
        icon: Search,
        step: "2",
        title: "Choose a place",
        description: "Browse restaurants, cafes and bars across Lancashire.",
    },
    {
        icon: Smartphone,
        step: "3",
        title: "Show your offer",
        description: "Use your member offer in venue and save when you eat out.",
    },
]

const areas = [
    "Blackpool",
    "Preston",
    "Lytham St Annes",
    "Lancaster",
    "Chorley",
    "Poulton",
    "Fleetwood",
    "Morecambe",
    "Blackburn",
    "Bolton",
    "Burnley",
    "Liverpool",
]

export function HowItWorks() {
    return (
        <>
            {/* How It Works */}
            <section id="how-it-works" className="py-12 md:py-20 bg-white">
                <div className="mx-auto max-w-7xl px-4 lg:px-8">
                    {/* Header */}
                    <div className="text-center mb-10 md:mb-14">
                        <h2 className="text-2xl md:text-4xl font-bold text-[#1C1917]">
                            How Eatinout works
                        </h2>
                    </div>

                    {/* Steps */}
                    <div className="grid gap-6 md:gap-8 md:grid-cols-3 max-w-4xl mx-auto mb-12">
                        {steps.map((step, index) => (
                            <div
                                key={index}
                                className="text-center"
                            >
                                <div className="relative inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#FAF9F7] text-[#DC3545] mb-4 border border-[#E8E4DF]">
                                    <step.icon className="h-7 w-7 md:h-8 md:w-8" />
                                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#DC3545] text-white text-xs font-bold flex items-center justify-center">
                                        {step.step}
                                    </span>
                                </div>
                                <h3 className="text-lg md:text-xl font-semibold text-[#1C1917] mb-2">
                                    {step.title}
                                </h3>
                                <p className="text-sm md:text-base text-[#57534E] text-pretty">
                                    {step.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="text-center">
                        <Button asChild className="bg-[#DC3545] hover:bg-[#C82333] text-white rounded-full px-8 py-6 text-base font-semibold shadow-lg shadow-[#DC3545]/20">
                            <Link href="/start">Start 7 days free</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Local Coverage Section */}
            <section className="py-12 md:py-20 bg-[#1C1917]">
                <div className="mx-auto max-w-7xl px-4 lg:px-8">
                    <div className="text-center mb-8 md:mb-10">
                        <p className="text-[#DC3545] text-sm font-semibold uppercase tracking-wider mb-3">
                            Local coverage
                        </p>
                        <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
                            500+ venues across Lancashire
                        </h2>
                        <p className="text-base text-[#A8A29E] max-w-xl mx-auto text-pretty">
                            From casual cafes to restaurants, bars and family favourites — Eatinout helps you save when you go out locally.
                        </p>
                    </div>

                    {/* Area pills */}
                    <div className="flex flex-wrap justify-center gap-2 md:gap-3 max-w-3xl mx-auto">
                        {areas.map((area, index) => (
                            <span
                                key={index}
                                className="px-4 py-2 rounded-full bg-white/10 text-white text-sm md:text-base font-medium border border-white/10 hover:bg-white/15 transition-colors cursor-default"
                            >
                                {area}
                            </span>
                        ))}
                    </div>
                </div>
            </section>
        </>
    )
}
