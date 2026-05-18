import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, UtensilsCrossed, Coffee, Wine } from "lucide-react"

export function HeroCard() {
    return (
        <div className="relative z-10 mx-auto max-w-lg px-4 py-2 md:py-0">
            <div className="rounded-2xl md:rounded-3xl bg-card/95 backdrop-blur-sm p-4 md:p-10 shadow-2xl border border-border/50">
                <div className="text-center space-y-3 md:space-y-5">
                    {/* Main Headline */}
                    <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-card-foreground text-balance">
                        Get up to 50% off restaurants near you
                    </h1>

                    {/* Clarification Line */}
                    <p className="text-sm md:text-base font-medium text-muted-foreground">
                        Not takeaway. Not delivery. Real dining-out deals at places you visit.
                    </p>

                    {/* Category Pills */}
                    <div className="flex justify-center gap-2 md:gap-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs md:text-sm font-medium">
                            <UtensilsCrossed className="h-3.5 w-3.5" />
                            Restaurants
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs md:text-sm font-medium">
                            <Coffee className="h-3.5 w-3.5" />
                            Cafés
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs md:text-sm font-medium">
                            <Wine className="h-3.5 w-3.5" />
                            Bars
                        </span>
                    </div>

                    {/* Supporting Copy */}
                    <p className="text-xs md:text-base text-muted-foreground leading-relaxed text-pretty">
                        Unlock offers at restaurants, cafés, bars and more — including 2-for-1 deals, freebies and exclusive local discounts.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col gap-2 md:gap-3 pt-1 md:pt-2">
                        <Button
                            asChild
                            size="lg"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-sm md:text-base font-semibold py-4 md:py-6"
                        >
                            <Link href="/start">
                                Start 7 days free
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="w-full rounded-full text-sm md:text-base font-medium py-4 md:py-6 border-border hover:bg-secondary"
                        >
                            <Link href="/start?path=learn">See how you can save</Link>
                        </Button>
                    </div>

                    {/* Text link */}
                    <a
                        href="https://www.eatinout.com"
                        className="inline-block text-xs md:text-sm font-medium text-primary hover:text-primary/80 transition-colors underline underline-offset-4"
                    >
                        See where you can save
                    </a>
                </div>
            </div>
        </div>
    )
}
