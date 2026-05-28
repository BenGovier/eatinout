import Image from "next/image"

const collageImages = [
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%201-zbS70z9QEVKloBqgf0Iieg3RIX0Av1.jpg", alt: "Indian curry spread with rice and naan" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%202-aAP2LjFfK0mcrPqws4gb8oiqyz0wtX.jpg", alt: "Asian chicken bowl with sesame" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%203-ORq5GHleVkiK7MfHyNyGrXmGGScBs2.jpg", alt: "Spaghetti and meatballs" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%204-C3o2ELUMQssCyt7pnXKTaLeRq3kEYf.jpg", alt: "Japanese sashimi and izakaya spread" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%205-tRPyDK3efA6nvkuWYIbhEFEEGgwcTV.jpg", alt: "Grilled steak with herb butter" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%206-Bw6ZT4D6eg3LfIi0SgIDQ1w8tcgYH3.jpg", alt: "Pasta twirled on fork" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%207-NJpl9eW27R85jXiuMsSNtIidlgpypl.jpg", alt: "Full English breakfast" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%208%20%281%29-ZDOPlX11zsPnWl85DaUhVYLXjZC8GA.jpg", alt: "Steaming ramen bowl" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%208-keic5Y6OdYsYTFxjq98LDkUa7hYvqK.jpg", alt: "General Tso chicken" },
]

export function ImageCollage() {
    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* Desktop Layout - Grid mosaic */}
            <div className="hidden md:grid h-full w-full grid-cols-4 grid-rows-3 gap-3 p-4">
                <div className="relative col-span-1 row-span-2 overflow-hidden rounded-2xl">
                    <Image
                        src={collageImages[0].src}
                        alt={collageImages[0].alt}
                        fill
                        className="object-cover"
                        sizes="25vw"
                    />
                </div>
                <div className="relative col-span-1 row-span-1 overflow-hidden rounded-2xl">
                    <Image
                        src={collageImages[1].src}
                        alt={collageImages[1].alt}
                        fill
                        className="object-cover"
                        sizes="25vw"
                    />
                </div>
                <div className="relative col-span-1 row-span-1 overflow-hidden rounded-2xl">
                    <Image
                        src={collageImages[2].src}
                        alt={collageImages[2].alt}
                        fill
                        className="object-cover"
                        sizes="25vw"
                    />
                </div>
                <div className="relative col-span-1 row-span-2 overflow-hidden rounded-2xl">
                    <Image
                        src={collageImages[3].src}
                        alt={collageImages[3].alt}
                        fill
                        className="object-cover"
                        sizes="25vw"
                    />
                </div>
                <div className="relative col-span-1 row-span-1 overflow-hidden rounded-2xl">
                    <Image
                        src={collageImages[4].src}
                        alt={collageImages[4].alt}
                        fill
                        className="object-cover"
                        sizes="25vw"
                    />
                </div>
                <div className="relative col-span-1 row-span-1 overflow-hidden rounded-2xl">
                    <Image
                        src={collageImages[5].src}
                        alt={collageImages[5].alt}
                        fill
                        className="object-cover"
                        sizes="25vw"
                    />
                </div>
                <div className="relative col-span-1 row-span-1 overflow-hidden rounded-2xl">
                    <Image
                        src={collageImages[6].src}
                        alt={collageImages[6].alt}
                        fill
                        className="object-cover"
                        sizes="25vw"
                    />
                </div>
                <div className="relative col-span-1 row-span-1 overflow-hidden rounded-2xl">
                    <Image
                        src={collageImages[7].src}
                        alt={collageImages[7].alt}
                        fill
                        className="object-cover"
                        sizes="25vw"
                    />
                </div>
                <div className="relative col-span-2 row-span-1 overflow-hidden rounded-2xl">
                    <Image
                        src={collageImages[8].src}
                        alt={collageImages[8].alt}
                        fill
                        className="object-cover"
                        sizes="50vw"
                    />
                </div>
            </div>

            {/* Mobile Layout - Stacked images with gradient overlay */}
            <div className="md:hidden h-full w-full">
                <div className="grid h-full grid-cols-2 gap-2 p-3">
                    {collageImages.slice(0, 4).map((image, index) => (
                        <div key={index} className="relative overflow-hidden rounded-xl">
                            <Image
                                src={image.src}
                                alt={image.alt}
                                fill
                                className="object-cover"
                                sizes="50vw"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/30" />
        </div>
    )
}
