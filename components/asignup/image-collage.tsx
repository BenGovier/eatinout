import Image from "next/image"

const collageImages = [
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%201-zbS70z9QEVKloBqgf0Iieg3RIX0Av1.jpg", alt: "Restaurant interior with warm lighting" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%202-aAP2LjFfK0mcrPqws4gb8oiqyz0wtX.jpg", alt: "People enjoying a meal together" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%203-ORq5GHleVkiK7MfHyNyGrXmGGScBs2.jpg", alt: "Cozy cafe atmosphere" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%204-C3o2ELUMQssCyt7pnXKTaLeRq3kEYf.jpg", alt: "Bar and restaurant setting" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%205-tRPyDK3efA6nvkuWYIbhEFEEGgwcTV.jpg", alt: "Friends at a local restaurant" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%206-Bw6ZT4D6eg3LfIi0SgIDQ1w8tcgYH3.jpg", alt: "Evening dinner scene" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%207-NJpl9eW27R85jXiuMsSNtIidlgpypl.jpg", alt: "Local cafe visit" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%208%20%281%29-ZDOPlX11zsPnWl85DaUhVYLXjZC8GA.jpg", alt: "Weekend brunch spot" },
    { src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/imagew%208-keic5Y6OdYsYTFxjq98LDkUa7hYvqK.jpg", alt: "Date night restaurant" },
]

export function ImageCollage() {
    return (
        <div className="absolute inset-0 overflow-hidden bg-[#F5F3EF]">
            {/* Desktop Layout - Grid mosaic with warm overlay */}
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

            {/* Mobile Layout - Stacked images */}
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

            {/* Warm gradient overlay for premium membership feel */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#FEFCF9]/40 via-transparent to-[#FEFCF9]/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#FEFCF9]/20 via-transparent to-[#FEFCF9]/20" />
        </div>
    )
}
