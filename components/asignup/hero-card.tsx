import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MapPin, BadgePercent, Utensils } from "lucide-react"

export function HeroCard() {
    return (
        <div className="relative z-10 mx-auto max-w-lg px-6 py-2 md:py-0">
            <div className="rounded-2xl md:rounded-3xl bg-card/95 backdrop-blur-sm p-4 md:p-10 shadow-2xl border border-border/50">
                <div className="text-center space-y-3 md:space-y-5">
                    {/* Main Headline */}
                    <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-card-foreground text-balance">
                        Get up to 50% off when dining out
                    </h1>

                    {/* Supporting Copy */}
                    <p className="text-xs md:text-base text-muted-foreground leading-relaxed text-pretty">
                        Your go-to for dining out deals near you — with offers at restaurants, cafés, bars and more.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col gap-2 md:gap-3 pt-1 md:pt-2">
                        <Button
                            asChild
                            size="lg"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-sm md:text-base font-semibold py-3 md:py-6"
                        >
                            <Link href="/start">Start my 7-day free trial</Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="w-full rounded-full text-sm md:text-base font-medium py-3 md:py-6 border-border hover:bg-secondary"
                        >
                            <a href="https://www.eatinout.com">See where I can save</a>
                        </Button>
                    </div>

                    {/* Pricing info */}
                    <p className="text-xs md:text-sm text-muted-foreground">
                        7 days free, then just £4.99/month. Cancel anytime.
                    </p>

                    {/* Value Row */}
                    <div className="flex flex-wrap justify-center gap-2 md:gap-4 pt-1">
                        <div className="flex items-center gap-1.5 text-xs md:text-sm text-card-foreground">
                            <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                            <span className="font-medium">500+ local venues</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs md:text-sm text-card-foreground">
                            <BadgePercent className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                            <span className="font-medium">Up to 50% off</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs md:text-sm text-card-foreground">
                            <Utensils className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                            <span className="font-medium">One meal covers membership</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
