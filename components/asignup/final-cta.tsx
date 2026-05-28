import Link from "next/link"
import { Button } from "@/components/ui/button"

export function FinalCTA() {
    return (
        <section className="py-12 md:py-20 bg-background">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                        Ready to start saving?
                    </h2>
                    <p className="text-muted-foreground text-sm md:text-base mb-8">
                        Try EatinOut free for 7 days. Cancel anytime.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-base font-semibold">
                            <Link href="/sign-up">Start my 7-day free trial</Link>
                        </Button>
                        <Button asChild variant="outline" className="rounded-full px-8 py-6 text-base font-medium border-border hover:bg-secondary">
                            <Link href="/restaurants">See where I can save</Link>
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-6">
                        7 days free, then just £4.99/month. Cancel anytime.
                    </p>
                </div>
            </div>
        </section>
    )
}
