import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Utensils } from "lucide-react"

export function HeroCard() {
    return (
        <div className="relative z-10 mx-auto max-w-lg px-6 py-2 md:py-0">
            <div className="rounded-2xl md:rounded-3xl bg-card/95 backdrop-blur-sm p-4 md:p-8 shadow-2xl border border-border/50">
                <div className="text-center space-y-3 md:space-y-4">
                    {/* Main Headline */}
                    <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-card-foreground text-balance">
                        Get up to 50% off when dining out
                    </h1>

                    {/* Supporting Copy */}
                    <p className="text-xs md:text-base text-muted-foreground leading-relaxed text-pretty">
                        Your go-to for dining out deals – with 1000&apos;s of offers at restaurants, cafes, bars and more.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col gap-2 md:gap-3 pt-1 md:pt-2">
                        <Button
                            asChild
                            size="lg"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-sm md:text-base font-semibold py-3 md:py-6"
                        >
                            <Link href="/start">Start my 30-day free trial</Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="w-full rounded-full text-sm md:text-base font-medium py-3 md:py-6 border-border hover:bg-secondary"
                        >
                            <Link href="/restaurants">See where I can save</Link>
                        </Button>
                    </div>

                    {/* Pricing info */}
                    <p className="text-xs md:text-sm text-muted-foreground">
                        30 days free, then just £4.99/month. Cancel anytime.
                    </p>

                    {/* Value Row - simplified */}
                    <div className="flex justify-center pt-1">
                        <div className="flex items-center gap-1.5 text-xs md:text-sm text-card-foreground">
                            <Utensils className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                            <span className="font-medium">1000&apos;s of restaurant offers</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
