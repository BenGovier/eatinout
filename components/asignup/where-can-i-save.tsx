import { Button } from "@/components/ui/button"

const categories = [
    "Restaurants",
    "Cafés",
    "Bars",
    "Casual dining",
    "Date nights",
    "Family meals",
    "Lunch deals",
    "2-for-1 offers",
    "Freebies",
    "Up to 50% off",
]

export function WhereCanISave() {
    return (
        <section className="py-12 md:py-20 bg-background">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                {/* Header */}
                <div className="text-center mb-10 md:mb-14">
                    <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
                        Find dining out deals near you
                    </h2>
                    <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
                        Eatinout gives members access to offers across Lancashire, including Preston, Blackpool, Lytham St Annes and more.
                    </p>
                </div>

                {/* Category Chips */}
                <div className="flex flex-wrap justify-center gap-2 md:gap-3 max-w-2xl mx-auto mb-10">
                    {categories.map((category) => (
                        <span
                            key={category}
                            className="inline-flex items-center px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium"
                        >
                            {category}
                        </span>
                    ))}
                </div>

                {/* Featured Venues Placeholder */}
                <div className="grid gap-4 md:gap-6 md:grid-cols-3 max-w-4xl mx-auto mb-10">
                    {[1, 2, 3].map((index) => (
                        <div
                            key={index}
                            className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 text-center"
                        >
                            <div className="w-12 h-12 rounded-full bg-secondary mx-auto mb-4" />
                            <p className="text-sm font-medium text-foreground mb-1">Featured venue</p>
                            <p className="text-xs text-muted-foreground">Exclusive member offer</p>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="text-center">
                    <Button asChild variant="outline" className="rounded-full px-8 py-6 text-base font-medium border-border hover:bg-secondary">
                        <a href="https://www.eatinout.com">See where I can save</a>
                    </Button>
                </div>
            </div>
        </section>
    )
}
