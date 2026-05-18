import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function HeroCard() {
    return (
        <div className="relative z-10 mx-auto max-w-lg px-6 py-2 md:py-0">
            <div className="rounded-2xl md:rounded-3xl bg-card/95 backdrop-blur-sm p-3 md:p-10 shadow-2xl border border-border/50">
                <div className="text-center space-y-2 md:space-y-5">
                    {/* Main Headline */}
                    <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-card-foreground text-balance">
                        Get up to 50% off restaurants near you
                    </h1>

                    {/* Supporting Copy */}
                    <p className="text-xs md:text-base text-muted-foreground leading-relaxed text-pretty">
                        Unlock offers at restaurants, cafés, bars and more — including 2-for-1 deals, freebies and exclusive local discounts.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col gap-1.5 md:gap-3 pt-1 md:pt-2">
                        <Button
                            asChild
                            size="lg"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-sm md:text-base font-semibold py-3 md:py-6"
                        >
                            <Link href="/start">
                                How do I save?
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="w-full rounded-full text-sm md:text-base font-medium py-3 md:py-6 border-border hover:bg-secondary"
                        >
                            <Link href="/start?path=learn">Start 7 days free</Link>
                        </Button>
                    </div>

                    {/* Pricing info */}
                    <p className="text-xs md:text-sm text-muted-foreground">
                        7 days free, then just £4.99/month. Cancel anytime.
                    </p>

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
