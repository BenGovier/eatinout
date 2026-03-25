"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Users, TrendingUp, DollarSign, Clock, CheckCircle, Award, PoundSterlingIcon } from "lucide-react"

export default function RestaurantLandingPage() {
  // Refs for animation elements
  const benefitsRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const testimonialsRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    document.title = "For restaurants"
  })

  // Simple animation on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fadeIn")
          }
        })
      },
      { threshold: 0.1 },
    )

    const elements = [benefitsRef.current, stepsRef.current, testimonialsRef.current, ctaRef.current]
    elements.forEach((el) => el && observer.observe(el))

    return () => {
      elements.forEach((el) => el && observer.unobserve(el))
    }
  }, [])

  return (
    <>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/restaurant-kitchen.webp"
            alt="Restaurant kitchen"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-red-900/30 mix-blend-multiply"></div>
        </div>

        <div className="container relative z-10 px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-4xl mx-auto">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-white drop-shadow-md">
                Grow Your Restaurant Business with Eatinout
              </h1>
              <p className="mx-auto max-w-[700px] text-xl text-white/90 md:text-2xl drop-shadow">
                Sign up for free and attract new diners with exclusive offers and promotions.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-6 transition-all hover:scale-105 shadow-lg"
              >
                <Link href="/join-restaurant">List Your Restaurant</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 text-lg px-8 py-6"
              >
                <a href="#how-it-works">Learn More</a>
              </Button>
            </div>

            {/* Stats */}
            {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 w-full">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white">
                <p className="text-3xl font-bold">1,200+</p>
                <p className="text-white/80">Restaurants</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white">
                <p className="text-3xl font-bold">50,000+</p>
                <p className="text-white/80">Monthly Users</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white">
                <p className="text-3xl font-bold">30%</p>
                <p className="text-white/80">Avg. Revenue Increase</p>
              </div>
            </div> */}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20" ref={benefitsRef}>
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Benefits for Restaurants</h2>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                Why hundreds of restaurants are joining Eatinout
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
            <div className="space-y-4 transition-all duration-300 hover:translate-y-[-5px]">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">Attract New Customers</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Reach thousands of potential customers who are actively looking for restaurant deals in your area.
                Increase foot traffic and fill empty tables.
              </p>
              <ul className="space-y-2 text-gray-500">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600 shrink-0 mt-0.5" />
                  <span>Targeted local audience</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600 shrink-0 mt-0.5" />
                  <span>Featured placement opportunities</span>
                </li>
              </ul>
            </div>
            <div className="space-y-4 transition-all duration-300 hover:translate-y-[-5px]">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <TrendingUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">Increase Revenue</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Fill empty tables during slow periods and increase overall revenue with strategic offers and promotions.
                Our platform helps you maximize profits.
              </p>
              <ul className="space-y-2 text-gray-500">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600 shrink-0 mt-0.5" />
                  <span>Boost off-peak hours</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600 shrink-0 mt-0.5" />
                  <span>Increase average order value</span>
                </li>
              </ul>
            </div>
            <div className="space-y-4 transition-all duration-300 hover:translate-y-[-5px]">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <PoundSterlingIcon className="h-8 w-8" /> 
              </div>
              <h3 className="text-xl font-bold">Zero Costs</h3>
              <p className="text-gray-500 dark:text-gray-400">
              List your restaurant and offers completely free. There are no subscription fees, hidden charges, or setup costs. 
              </p>
              <ul className="space-y-2 text-gray-500">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600 shrink-0 mt-0.5" />
                  <span>Free registration and setup</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600 shrink-0 mt-0.5" />
                  <span>No monthly fees</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50 dark:bg-gray-900" ref={stepsRef}>
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">How It Works for Restaurants</h2>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                Three simple steps to start growing your business
              </p>
            </div>
            <div className="grid gap-10 sm:grid-cols-3 lg:gap-12 mt-12">
              <div className="relative space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white">
                  <span className="text-2xl font-bold">1</span>
                </div>
                {/* Connector line */}
                {/* <div className="hidden sm:block absolute top-8 left-[100%] w-[calc(50%_+_1rem)] h-0.5 bg-red-200"></div> */}
                <h3 className="text-xl font-bold">Register for Free</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Sign up and create your restaurant profile with details, images, and operating hours in just minutes.
                </p>
                <div className="pt-2">
                  <Clock className="h-5 w-5 text-gray-400 inline mr-2" />
                  <span className="text-sm text-gray-500">Takes only 5 minutes</span>
                </div>
              </div>
              <div className="relative space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white">
                  <span className="text-2xl font-bold">2</span>
                </div>
                {/* Connector line */}
                {/* <div className="hidden sm:block absolute top-8 left-[100%] w-[calc(50%_+_1rem)] h-0.5 bg-red-200"></div> */}
                <h3 className="text-xl font-bold">Create Offers</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Design attractive offers using our templates or create custom deals that bring in new customers.
                </p>
                <div className="pt-2">
                  <Award className="h-5 w-5 text-gray-400 inline mr-2" />
                  <span className="text-sm text-gray-500">Customizable templates</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white">
                  <span className="text-2xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-bold">Welcome New Customers</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Verify redemption codes and welcome new customers to your restaurant. Watch your business grow.
                </p>
                <div className="pt-2">
                  <Users className="h-5 w-5 text-gray-400 inline mr-2" />
                  <span className="text-sm text-gray-500">Increase customer base</span>
                </div>
              </div>
            </div>            <Button asChild className="mt-12 bg-red-600 hover:bg-red-700 text-white px-8" size="lg">
              <Link href="/join-restaurant">Get Started Now</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {/* <section className="py-20" ref={testimonialsRef}>
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Testimonials</h2>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                Hear from restaurant owners who have joined Eatinout
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:gap-12 mt-12">
              <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 rounded-full overflow-hidden">
                        <Image
                          src="/placeholder.svg?height=64&width=64"
                          alt="Maria Rodriguez"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium">Maria Rodriguez</p>
                        <p className="text-sm text-gray-500">Owner, Taste of Italy</p>
                      </div>
                    </div>
                    <div className="flex pb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className="h-5 w-5 text-yellow-500 fill-current" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ))}
                    </div>
                    <p className="italic">
                      "Since joining Eatinout, we've seen a 30% increase in weekday customers. The platform is easy to
                      use and the team is very supportive. It's been a game-changer for our business during slower
                      periods."
                    </p>
                    <p className="text-sm text-gray-500">Joined Eatinout 6 months ago</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 rounded-full overflow-hidden">
                        <Image
                          src="/placeholder.svg?height=64&width=64"
                          alt="James Chen"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium">James Chen</p>
                        <p className="text-sm text-gray-500">Manager, Fusion Kitchen</p>
                      </div>
                    </div>
                    <div className="flex pb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className="h-5 w-5 text-yellow-500 fill-current" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ))}
                    </div>
                    <p className="italic">
                      "Eatinout has helped us attract a younger demographic that we were struggling to reach. The
                      analytics dashboard is particularly useful for tracking performance and optimizing our offers."
                    </p>
                    <p className="text-sm text-gray-500">Joined Eatinout 1 year ago</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section> */}

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Frequently Asked Questions</h2>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                Everything you need to know about joining Eatinout
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:gap-12 max-w-4xl mx-auto">
            {/* <div className="space-y-2">
              <h3 className="text-xl font-bold">How much does it cost to join?</h3>
              <p className="text-gray-500">
                It's completely free to register and list your restaurant. We only take a small commission on redeemed
                offers.
              </p>
            </div> */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold">How do customers redeem offers?</h3>
              <p className="text-gray-500">
                Customers show a unique code at your restaurant which you can verify through our simple dashboard.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Can I control when offers are valid?</h3>
              <p className="text-gray-500">
                Yes, you have complete control over the days, times, and conditions of your offers.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">How quickly can I get started?</h3>
              <p className="text-gray-500">
                You can set up your profile and create your first offer in less than 15 minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-red-600" ref={ctaRef}>
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl text-white">
                Ready to Grow Your Business?
              </h2>
              <p className="mx-auto max-w-[700px] text-white/90 md:text-xl">
                Join hundreds of restaurants already benefiting from Eatinout
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="bg-white text-red-600 hover:bg-gray-100 text-lg px-8 py-6 mt-6 transition-all hover:scale-105 shadow-lg"
            >
              <Link href="/join-restaurant">List Your Restaurant</Link>
            </Button>
            <p className="text-white/80 text-sm mt-4">No credit card required • Free setup • Cancel anytime</p>
          </div>
        </div>
      </section>
    </>
  )
}

