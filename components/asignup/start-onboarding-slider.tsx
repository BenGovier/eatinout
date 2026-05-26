"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft } from "lucide-react"

interface Slide {
    eyebrow: string
    title: string
    body: string
    secondaryText?: string
    image: string
    imageAlt: string
}

const trialSlides: Slide[] = [
    {
        eyebrow: "What you get",
        title: "Your free trial gives you access to hundreds of offers at restaurants, cafes, bars & more.",
        body: "Great places. Better prices. More reasons to go out.",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/22.png-FjHsCSsScJT76IHTeq7DFobAck45ur.jpeg",
        imageAlt: "Italian dinner table with pasta dishes and wine glasses",
    },
    {
        eyebrow: "Dining out made easy.",
        title: "Select an offer.\nShow your code.\nSave money.",
        body: "That's it.",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/23.png-tQ45xH7IrdDDj3mI6jwx9lEQ5VJUkw.jpeg",
        imageAlt: "Woman using phone at a stylish bar",
    },
    {
        eyebrow: "Just one meal covers your membership.",
        title: "Two people spending £50 on dinner save £25 with a 50% off offer.",
        body: "That's already 5x more than the £4.99 monthly membership.",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/26.png-iNNou4R566SusNbIarXFzgAd9Yi0RG.jpeg",
        imageAlt: "Couple having romantic dinner with wine and pasta",
    },
]

const learnSlides: Slide[] = [
    {
        eyebrow: "Find places worth going out for.",
        title: "And savings that help you do it more often.",
        body: "Breakfast to dinner to drinks — going out just got easier.",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/24.png-3mwj9GDBCqNH6w6511lQ6fzN5IHbFh.jpeg",
        imageAlt: "Friends cheering with beers over a table of food",
    },
    {
        eyebrow: "Go out — don't order in.",
        title: "Inflated menu prices? Nope.\nHidden fees? Never.\nSavings? Always.",
        body: "",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/27.png-hUSUO9R3DtcdPTBULu6HHVyW2rw4DA.jpeg",
        imageAlt: "Burger with onion rings and drinks at a pub",
    },
    {
        eyebrow: "Save money without staying home.",
        title: "Quick catchups, family lunches, or last-minute dinner plans.",
        body: "The meals you already go out for. Just cheaper.",
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/25.png-yQfK5etiXS2PW7TekgclKdA0xNYWHe.jpeg",
        imageAlt: "Chef drizzling sauce over plated chicken in restaurant kitchen",
    },
]

interface StartOnboardingSliderProps {
    path?: string
}

export function StartOnboardingSlider({ path }: StartOnboardingSliderProps) {
    const router = useRouter()
    const [currentSlide, setCurrentSlide] = useState(0)
    const [direction, setDirection] = useState(1)

    const slides = path === "learn" ? learnSlides : trialSlides

    const isLastSlide = currentSlide === slides.length - 1
    const isFirstSlide = currentSlide === 0

    const goToNext = () => {
        if (!isLastSlide) {
            setDirection(1)
            setCurrentSlide((prev) => prev + 1)
        }
    }

    const goToPrevious = () => {
        if (!isFirstSlide) {
            setDirection(-1)
            setCurrentSlide((prev) => prev - 1)
        }
    }

    const goBack = () => {
        if (window.history.length > 1) {
            router.back()
        } else {
            router.push("/asignup")
        }
    }

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? "100%" : "-100%",
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction > 0 ? "-100%" : "100%",
            opacity: 0,
        }),
    }

    const swipeConfidenceThreshold = 10000
    const swipePower = (offset: number, velocity: number) => {
        return Math.abs(offset) * velocity
    }

    const handleDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
        const swipe = swipePower(offset.x, velocity.x)

        if (swipe < -swipeConfidenceThreshold && !isLastSlide) {
            setDirection(1)
            setCurrentSlide((prev) => prev + 1)
        } else if (swipe > swipeConfidenceThreshold && !isFirstSlide) {
            setDirection(-1)
            setCurrentSlide((prev) => prev - 1)
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Main content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Image Section - Swipeable */}
                <div className="relative h-[35vh] md:h-[40vh] lg:h-auto lg:w-1/2 overflow-hidden touch-pan-y">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentSlide}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={1}
                            onDragEnd={handleDragEnd}
                            className="absolute inset-0 cursor-grab active:cursor-grabbing"
                        >
                            <Image
                                src={slides[currentSlide].image}
                                alt={slides[currentSlide].imageAlt}
                                fill
                                className="object-cover pointer-events-none"
                                priority
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Content Section */}
                <div className="flex-1 lg:w-1/2 flex flex-col justify-center px-5 py-6 md:px-8 md:py-10 lg:px-16 lg:py-12 bg-background">
                    <div className="max-w-md mx-auto lg:mx-0 w-full">
                        {/* Header with Logo and Back */}
                        <div className="flex items-center justify-between mb-6 lg:mb-10">
                            <Image
                                src="/eatinout-logo.webp"
                                alt="EatinOut"
                                width={120}
                                height={32}
                                className="h-7 lg:h-9 w-auto"
                            />
                            <button
                                onClick={goBack}
                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="hidden md:inline">Back</span>
                            </button>
                        </div>

                        {/* Slide Content - Swipeable */}
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={currentSlide}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={1}
                                onDragEnd={handleDragEnd}
                                className="space-y-3 lg:space-y-5 cursor-grab active:cursor-grabbing touch-pan-y"
                            >
                                {/* Eyebrow */}
                                <p className="text-xs md:text-sm font-medium text-primary uppercase tracking-wide">
                                    {slides[currentSlide].eyebrow}
                                </p>

                                {/* Title */}
                                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-foreground whitespace-pre-line">
                                    {slides[currentSlide].title}
                                </h1>

                                {/* Body */}
                                {slides[currentSlide].body && (
                                    <p className="text-sm md:text-base lg:text-lg text-muted-foreground leading-relaxed">
                                        {slides[currentSlide].body}
                                    </p>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Pagination Dots */}
                        <div className="flex gap-2 mt-6 lg:mt-10">
                            {slides.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setDirection(index > currentSlide ? 1 : -1)
                                        setCurrentSlide(index)
                                    }}
                                    className={`h-2 rounded-full transition-all duration-300 ${index === currentSlide
                                            ? "w-6 bg-primary"
                                            : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                        }`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="mt-6 lg:mt-8 space-y-3">
                            {isLastSlide ? (
                                <Button
                                    asChild
                                    size="lg"
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-semibold py-5 md:py-6"
                                >
                                    <a href="/sign-up">
                                        Start my 7-day free trial
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </a>
                                </Button>
                            ) : (
                                <Button
                                    onClick={goToNext}
                                    size="lg"
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-semibold py-5 md:py-6"
                                >
                                    Next
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}

                            <div className="flex items-center justify-center gap-6">
                                {!isFirstSlide && (
                                    <button
                                        onClick={goToPrevious}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Back
                                    </button>
                                )}
                                <a
                                    href="/sign-up"
                                    className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                                >
                                    Skip straight to sign up
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
