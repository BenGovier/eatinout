import Image from "next/image"
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

const featuredVenues = [
    {
        name: "Nuvo",
        logo: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/nuvo%20logo-gvF5ZkJ1Hd82Lcy81oAUt0DpNS00hM.webp",
        offer: "Up to 50% off!",
    },
    {
        name: "Turtle Bay",
        logo: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/turtlebay-xJ4TaYlfNl8ljPMkOEuCUTavIlPR1n.png",
        offer: "Up to 50% off!",
    },
    {
        name: "Olive Tree Brasserie",
        logo: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/olive%20tree%20brasserie-Z3sY33DhyknOhlUQq42wOHqrFJU1rD.png",
        offer: "Up to 50% off!",
    },
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

                {/* Featured Venues */}
                <div className="grid gap-4 md:gap-6 md:grid-cols-3 max-w-4xl mx-auto mb-10">
                    {featuredVenues.map((venue) => (
                        <div
                            key={venue.name}
                            className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 text-center"
                        >
                            <div className="w-20 h-20 rounded-xl mx-auto mb-4 overflow-hidden flex items-center justify-center bg-white">
                                <Image
                                    src={venue.logo}
                                    alt={venue.name}
                                    width={80}
                                    height={80}
                                    className="object-contain w-full h-full"
                                />
                            </div>
                            <p className="text-sm font-medium text-foreground mb-1">{venue.name}</p>
                            <p className="text-xs font-semibold text-primary">{venue.offer}</p>
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
