import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MapPin, Smartphone, BadgeCheck, Ticket } from "lucide-react"

export function HeroCard() {
    return (
        <div className="relative z-10 mx-auto max-w-xl px-4 py-4 md:py-0">
            <div className="rounded-3xl bg-[#FEFCF9]/97 backdrop-blur-md p-6 md:p-10 shadow-2xl border border-[#E8E4DF]">
                <div className="text-center space-y-4 md:space-y-5">
                    {/* Membership Badge */}
                    <div className="inline-flex items-center gap-2 bg-[#DC3545]/10 text-[#DC3545] px-4 py-1.5 rounded-full text-xs font-semibold">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        <span>Save up to 50% when you eat out</span>
                    </div>

                    {/* Main Headline */}
                    <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[#1C1917] text-balance leading-tight">
                        Lancashire&apos;s eating out membership
                    </h1>

                    {/* Supporting Copy */}
                    <p className="text-sm md:text-base text-[#57534E] leading-relaxed text-pretty max-w-md mx-auto">
                        Get 7 days free access to offers at 500+ restaurants, cafes and bars across Lancashire — then just £4.99/month.
                    </p>

                    {/* Trust Line */}
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs md:text-sm text-[#78716C]">
                        <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            500+ venues
                        </span>
                        <span className="hidden md:inline text-[#D6D3D1]">|</span>
                        <span className="flex items-center gap-1.5">
                            <Smartphone className="h-3.5 w-3.5" />
                            Show in venue
                        </span>
                        <span className="hidden md:inline text-[#D6D3D1]">|</span>
                        <span>Cancel anytime</span>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col gap-3 pt-2">
                        <Button
                            asChild
                            size="lg"
                            className="w-full bg-[#DC3545] hover:bg-[#C82333] text-white rounded-full text-sm md:text-base font-semibold py-6 shadow-lg shadow-[#DC3545]/20"
                        >
                            <Link href="/start">Start 7 days free</Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="w-full rounded-full text-sm md:text-base font-medium py-6 border-[#E8E4DF] bg-white hover:bg-[#FAF9F7] text-[#1C1917]"
                        >
                            <Link href="/restaurants">Browse restaurants</Link>
                        </Button>
                    </div>

                    {/* Pricing info */}
                    <p className="text-xs text-[#78716C]">
                        7 days free, then £4.99/month. Cancel anytime.
                    </p>
                </div>
            </div>

            {/* Floating Member Pass Card - Desktop only */}
            <div className="hidden lg:block absolute -right-32 top-1/2 -translate-y-1/2 w-48">
                <div className="bg-white rounded-2xl shadow-xl border border-[#E8E4DF] p-4 transform rotate-6 hover:rotate-3 transition-transform">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[#DC3545]/10 flex items-center justify-center">
                            <Ticket className="w-4 h-4 text-[#DC3545]" />
                        </div>
                        <span className="text-xs font-semibold text-[#1C1917]">Member Offer</span>
                    </div>
                    <p className="text-[10px] text-[#78716C] mb-2">Show this at</p>
                    <p className="text-sm font-semibold text-[#1C1917] mb-1">Turtle Bay</p>
                    <p className="text-xs text-[#57534E]">20% off food</p>
                    <div className="mt-3 pt-3 border-t border-[#E8E4DF]">
                        <p className="text-[10px] text-[#78716C]">Included with Eatinout</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
