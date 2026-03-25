"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Heart, TrendingUp, Award, Clock, Globe, Utensils, Smile } from "lucide-react"

export default function AboutPage() {
  // Refs for animation elements
  const missionRef = useRef<HTMLDivElement>(null)
  const storyRef = useRef<HTMLDivElement>(null)
  const valuesRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    document.title = "About Us"
  })

  // Animation on scroll
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

    const elements = [missionRef.current, storyRef.current, valuesRef.current, statsRef.current, ctaRef.current]

    elements.forEach((el) => el && observer.observe(el))

    return () => {
      elements.forEach((el) => el && observer.unobserve(el))
    }
  }, [])


  // Animated counter hook
  useEffect(() => {
    const counters = document.querySelectorAll(".counter-value")

    counters.forEach((counter) => {
      const target = Number.parseInt(counter.getAttribute("data-target") || "0")
      const duration = 2000 // ms
      const step = target / (duration / 16) // 60fps

      let current = 0
      const updateCounter = () => {
        current += step
        if (current < target) {
          counter.textContent = Math.ceil(current).toString()
          requestAnimationFrame(updateCounter)
        } else {
          counter.textContent = target.toString()
        }
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            updateCounter()
            observer.unobserve(entry.target)
          }
        })
      })

      observer.observe(counter)
    })
  }, [])

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/fine-dining.webp"
            alt="Restaurant dining experience"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-red-900/30 mix-blend-multiply"></div>
        </div>

        <div className="relative z-10 container py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fadeIn">About Eatinout</h1>
            <p className="text-xl md:text-2xl text-white/90 animate-fadeIn animation-delay-300">
              Connecting food lovers with amazing restaurant deals since 2024.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-24 bg-white" ref={missionRef}>
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 border-l-4 border-red-600 pl-4">Our Mission</h2>
              <p className="text-lg text-gray-700">
                At Eatinout, our mission is to make dining out more accessible and affordable for everyone while helping
                restaurants fill their tables during slower periods.
              </p>
              <p className="text-lg text-gray-700">
                We believe that great food experiences shouldn't be limited by budget constraints. By connecting diners
                with exclusive restaurant deals, we're creating a win-win situation for both food lovers and restaurant
                owners.
              </p>
              <div className="space-y-3 pt-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-red-100 flex items-center justify-center mr-3">
                    <Heart className="h-3 w-3 text-red-600" />
                  </div>
                  <p className="text-gray-700">
                    <span className="font-medium">Accessibility</span> - Making dining experiences available to all
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-red-100 flex items-center justify-center mr-3">
                    <TrendingUp className="h-3 w-3 text-red-600" />
                  </div>
                  <p className="text-gray-700">
                    <span className="font-medium">Growth</span> - Helping restaurants thrive and expand their customer
                    base
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-red-100 flex items-center justify-center mr-3">
                    <Users className="h-3 w-3 text-red-600" />
                  </div>
                  <p className="text-gray-700">
                    <span className="font-medium">Community</span> - Building connections between diners and local
                    restaurants
                  </p>
                </div>
              </div>
            </div>
            <div className="relative h-80 md:h-96 rounded-lg overflow-hidden shadow-xl">
              <Image src="/images/restaurant-patio.webp" alt="Restaurant patio dining" fill className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-16 md:py-24 bg-gray-50" ref={storyRef}>
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 relative h-80 md:h-96 rounded-lg overflow-hidden shadow-xl">
              <Image src="/images/chef-plating.webp" alt="Chef plating a dish" fill className="object-cover" />
            </div>
            <div className="order-1 md:order-2 space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 border-l-4 border-red-600 pl-4">Our Story</h2>

              <div className="space-y-8">
                <div className="relative pl-10 border-l-2 border-red-200">
                  <div className="absolute left-[-8px] top-0 h-4 w-4 rounded-full bg-red-600"></div>
                  <h3 className="text-xl font-bold text-gray-900">2024: The Beginning</h3>
                  <p className="text-gray-700 mt-2">
                    Eatinout was founded by a group of food enthusiasts who were frustrated by the lack of affordable
                    dining options in their city. They saw an opportunity to connect restaurants with empty tables to
                    diners looking for great deals.
                  </p>
                </div>

                <div className="relative pl-10 border-l-2 border-red-200">
                  <div className="absolute left-[-8px] top-0 h-4 w-4 rounded-full bg-red-600"></div>
                  <h3 className="text-xl font-bold text-gray-900">2024: First Partnerships</h3>
                  <p className="text-gray-700 mt-2">
                    We launched with just 10 restaurant partners in a single city. The response was overwhelming, with
                    hundreds of diners taking advantage of exclusive deals in the first month alone.
                  </p>
                </div>

                <div className="relative pl-10">
                  <div className="absolute left-[-8px] top-0 h-4 w-4 rounded-full bg-red-600"></div>
                  <h3 className="text-xl font-bold text-gray-900">Today & Beyond</h3>
                  <p className="text-gray-700 mt-2">
                    What started as a simple idea has grown into a platform that connects thousands of diners with
                    hundreds of restaurants across multiple cities. We're just getting started on our mission to
                    transform the dining experience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-16 md:py-24 bg-gray-50" ref={valuesRef}>
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Core Values</h2>
            <p className="text-lg text-gray-700">These principles guide everything we do at Eatinout</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Quality",
                description:
                  "We partner only with restaurants that meet our high standards for food quality and service.",
                icon: Award,
              },
              {
                title: "Transparency",
                description: "We believe in clear, honest communication with both diners and restaurant partners.",
                icon: Globe,
              },
              {
                title: "Innovation",
                description: "We're constantly exploring new ways to improve the dining experience for everyone.",
                icon: Utensils,
              },
              {
                title: "Accessibility",
                description: "We're committed to making great dining experiences available to everyone.",
                icon: Users,
              },
              {
                title: "Reliability",
                description: "Our users and partners can count on us to deliver what we promise, every time.",
                icon: Clock,
              },
              {
                title: "Joy",
                description:
                  "We believe dining out should be a joyful experience, and we bring that same joy to our work.",
                icon: Smile,
              },
            ].map((value, index) => (
              <Card
                key={index}
                className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <value.icon className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-gray-700">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-24 bg-white" ref={statsRef}>
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Eatinout by the Numbers</h2>
            <p className="text-lg text-gray-700">Our impact on the dining community continues to grow</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                value: 1245,
                label: "Happy Diners",
                suffix: "+",
              },
              {
                value: 87,
                label: "Restaurant Partners",
                suffix: "",
              },
              {
                value: 3,
                label: "Cities",
                suffix: "",
              },
              {
                value: 30,
                label: "Average Savings",
                suffix: "%",
              },
            ].map((stat, index) => (
              <Card key={index} className="overflow-hidden text-center">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center">
                    <span
                      className="counter-value text-4xl md:text-5xl font-bold text-red-600"
                      data-target={stat.value}
                    >
                      0
                    </span>
                    <span className="text-4xl md:text-5xl font-bold text-red-600">{stat.suffix}</span>
                  </div>
                  <p className="text-gray-700 mt-2">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-red-600" ref={ctaRef}>
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Join the Eatinout Community?</h2>
              <p className="text-xl text-white/90 mb-8">
                Whether you're a food lover looking for great deals or a restaurant owner wanting to reach new
                customers, we'd love to have you join us.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="bg-white text-red-600 hover:bg-gray-100">
                  <Link href="/sign-up">Join as a Diner</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="text-gray-800 border-white hover:bg-red-700 hover:text-white"
                >
                  <Link href="/join-restaurant">Register Your Restaurant</Link>
                </Button>
              </div>
            </div>
            <div className="relative h-64 md:h-80 rounded-lg overflow-hidden shadow-xl">
              <Image src="/images/tapas-dining.webp" alt="Dining experience" fill className="object-cover" />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

