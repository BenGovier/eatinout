"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tag, ChevronLeft, ChevronRight } from "lucide-react"
import { useRef } from "react"

const featuredRestaurants = [
    {
        name: "Nuvo",
        location: "Preston",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/nuvo%20logo-gvF5ZkJ1Hd82Lcy81oAUt0DpNS00hM.webp",
        offer: "Up to 50% off",
    },
    {
        name: "Turtle Bay",
        location: "Liverpool",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/turtlebay-xJ4TaYlfNl8ljPMkOEuCUTavIlPR1n.png",
        offer: "2-for-1 cocktails",
    },
    {
        name: "Olive Tree Brasserie",
        location: "Bolton",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/olive%20tree%20brasserie-Z3sY33DhyknOhlUQq42wOHqrFJU1rD.png",
        offer: "25% off food",
    },
    {
        name: "The Adelphi",
        location: "Preston",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/22.png-FjHsCSsScJT76IHTeq7DFobAck45ur.jpeg",
        offer: "30% off mains",
    },
    {
        name: "Fazenda",
        location: "Liverpool",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/22.png-FjHsCSsScJT76IHTeq7DFobAck45ur.jpeg",
        offer: "15% off bill",
    },
    {
        name: "Victors",
        location: "Hale",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/22.png-FjHsCSsScJT76IHTeq7DFobAck45ur.jpeg",
        offer: "20% off food",
    },
]

export function WhereCanISave() {
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const scrollAmount = 280
            scrollContainerRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            })
        }
    }

    return (
        <section className="py-12 md:py-20 bg-background">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                {/* Header */}
                <div className="text-center mb-8 md:mb-12">
                    <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
                        Find dining out deals near you
                    </h2>
                    <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
                        EatinOut gives members access to offers across the whole of Lancashire, Bolton and Liverpool.
                    </p>
                </div>

                {/* Restaurant Carousel */}
                <div className="relative mb-10">
                    {/* Scroll buttons - hidden on mobile */}
                    <button
                        onClick={() => scroll("left")}
                        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center hover:bg-gray-50 transition-colors"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                        onClick={() => scroll("right")}
                        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center hover:bg-gray-50 transition-colors"
                        aria-label="Scroll right"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>

                    {/* Scrollable container */}
                    <div
                        ref={scrollContainerRef}
                        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 -mx-4 px-4"
                    >
                        {featuredRestaurants.map((restaurant, index) => (
                            <div
                                key={index}
                                className="flex-shrink-0 w-[200px] md:w-[240px] snap-start bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                            >
                                {/* Image with offer badge */}
                                <div className="relative h-[120px] md:h-[140px] w-full overflow-hidden bg-gray-100">
                                    <Image
                                        src={restaurant.image}
                                        alt={restaurant.name}
                                        fill
                                        className="object-cover"
                                    />
                                    {/* Offer badge */}
                                    <div className="absolute top-2 left-0">
                                        <div className="bg-[#DC3545] text-white font-semibold text-xs px-2 py-1">
                                            {restaurant.offer}
                                        </div>
                                    </div>
                                </div>

                                {/* Card content */}
                                <div className="p-3">
                                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                                        {restaurant.name}
                                    </h3>
                                    <p className="text-gray-500 text-xs mt-0.5">
                                        {restaurant.location}
                                    </p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <Tag className="h-3 w-3 text-[#DC3545]" />
                                        <span className="text-xs font-medium text-gray-600">
                                            {restaurant.offer}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
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
