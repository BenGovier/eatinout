import { Calculator } from "lucide-react"

export function ValueReinforcement() {
    return (
        <section id="pricing" className="py-10 md:py-14 bg-secondary/30">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                {/* Header */}
                <div className="text-center mb-8 md:mb-10">
                    <h2 className="text-2xl md:text-4xl font-bold text-foreground">
                        One meal out can cover your membership
                    </h2>
                </div>

                {/* Value Calculation Card */}
                <div className="max-w-lg mx-auto">
                    <div className="bg-card rounded-2xl md:rounded-3xl p-6 md:p-10 shadow-lg border border-border/50">
                        <div className="flex items-center justify-center mb-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                                <Calculator className="h-6 w-6" />
                            </div>
                        </div>

                        <div className="space-y-4 text-center">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm md:text-base">
                                    <span className="text-muted-foreground">Two people spend on dinner</span>
                                    <span className="font-semibold text-foreground">£50</span>
                                </div>
                                <div className="flex items-center justify-between text-sm md:text-base">
                                    <span className="text-muted-foreground">50% off offer saves</span>
                                    <span className="font-semibold text-primary">−£24</span>
                                </div>
                                <div className="border-t border-border pt-3">
                                    <div className="flex items-center justify-between text-sm md:text-base">
                                        <span className="text-muted-foreground">Your membership</span>
                                        <span className="font-semibold text-foreground">£4.99/month</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border">
                                <p className="text-xl md:text-2xl font-bold text-foreground">
                                    That&apos;s around <span className="text-primary">5x</span> the monthly cost saved in one meal
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Supporting copy */}
                <p className="text-center text-sm md:text-base text-muted-foreground mt-8 max-w-md mx-auto">
                    Use EatinOut once and you&apos;re quids in!
                </p>
            </div>
        </section>
    )
}
