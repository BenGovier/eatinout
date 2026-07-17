"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { trackAsignupEvent } from "@/components/asignup/track"

export function FinalCTA() {
    return (
        <section className="py-12 md:py-16 bg-background">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                <div className="mx-auto max-w-2xl rounded-3xl bg-secondary/40 px-6 py-10 text-center md:px-12 md:py-14">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                        Ready to start saving?
                    </h2>
                    <p className="text-muted-foreground text-base md:text-lg mb-8">
                        Try EatinOut free for 30 days. Cancel anytime.
                    </p>
                    <div className="flex flex-col items-center gap-3">
                        <Button asChild size="lg" className="h-auto w-full max-w-sm rounded-full bg-primary py-7 text-lg font-bold text-primary-foreground shadow-lg hover:bg-primary/90">
                            <Link
                                href="/sign-up"
                                onClick={() => trackAsignupEvent("asignup_start_trial_click")}
                            >
                                Start my 30-day free trial
                            </Link>
                        </Button>
                        <Button asChild variant="ghost" className="rounded-full px-6 py-3 text-base font-medium text-foreground hover:bg-secondary">
                            <Link
                                href="/restaurants"
                                onClick={() => trackAsignupEvent("asignup_view_restaurants_click")}
                            >
                                See where I can save
                            </Link>
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-6">
                        30 days free, then just £4.99/month. Cancel anytime.
                    </p>
                </div>
            </div>
        </section>
    )
}
