"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Logo } from "@/components/logo"
import { Footer } from "@/components/asignup/footer"
import { Header } from "@/components/asignup/header"
import { 
  CheckCircle, 
  Users, 
  PoundSterling, 
  Utensils, 
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  Building2,
  User,
  MessageSquare,
  ArrowRight,
  Calendar,
  Clock,
  BookOpen,
  Pause,
  RefreshCw,
  Settings
} from "lucide-react"

export default function PartnerInfoPage() {
  const [formData, setFormData] = useState({
    venueName: "",
    contactName: "",
    email: "",
    phone: "",
    city: "",
    message: "",
    acceptTerms: false,
    acceptMarketing: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const demoFormRef = useRef<HTMLDivElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.checked }))
  }

  const scrollToDemo = () => {
    demoFormRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    setSubmitSuccess(true)
    setIsSubmitting(false)
  }

  const faqItems = [
    {
      question: "Who takes the payment?",
      answer: "You do. Customers pay your restaurant directly as normal. Eatinout does not process payments and does not take commission."
    },
    {
      question: "Can I change my offer?",
      answer: "Yes. You can change, pause or update your offer whenever you need. For example, you could run 30% off food Monday–Thursday, 4pm–6pm, bookings only."
    },
    {
      question: "Is it really free to list?",
      answer: "Yes. Listing your venue on Eatinout is completely free. There are no setup costs, no monthly fees, and no hidden charges."
    },
    {
      question: "Do you take commission?",
      answer: "No. We do not take any commission from your sales. The customer pays you directly."
    },
    {
      question: "Will this attract takeaway customers?",
      answer: "No. Eatinout is built for dining out, not delivery. Our members are local people looking to visit restaurants, cafés, and bars in person."
    },
    {
      question: "Can I pause my offer?",
      answer: "Yes. You can pause your offer at any time and reactivate it when you're ready."
    },
    {
      question: "What kind of customers use Eatinout?",
      answer: "Local diners actively looking for places to eat out. These are people ready to visit and spend money at your venue."
    }
  ]

  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-white">
      {/* Header - using shared site header */}
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-red-50/30" />
        <div className="relative max-w-7xl mx-auto px-4 pt-8 pb-12 md:py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Content */}
            <div className="space-y-5 md:space-y-6">
              {/* Headline - comes first on mobile */}
              <div className="space-y-4">
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-[1.1] tracking-tight">
                  Get more diners.<br />
                  <span className="text-[#DC3545]">Pay no commission.</span>
                </h1>
                <p className="text-base md:text-xl text-gray-600 leading-relaxed max-w-xl">
                  List your venue on Eatinout for free and reach local people actively looking for places to eat out. You keep the customer, you take the payment, and you stay in control of your offer.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-[#DC3545] hover:bg-[#c82333] text-white text-base md:text-lg px-6 md:px-8 py-5 md:py-6 rounded-xl shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 transition-all"
                >
                  <Link href="/join-restaurant">
                    Sign up free now
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={scrollToDemo}
                  className="text-base md:text-lg px-6 md:px-8 py-5 md:py-6 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Learn more
                </Button>
              </div>

              {/* Compact trust strip - after CTAs */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Free to list
                </span>
                <span className="hidden sm:inline text-gray-300">|</span>
                <span className="inline-flex items-center gap-1.5">
                  <PoundSterling className="w-4 h-4 text-blue-600" />
                  No commission
                </span>
                <span className="hidden sm:inline text-gray-300">|</span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#DC3545]" />
                  500+ venues
                </span>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative mt-4 lg:mt-0">
              <div className="relative aspect-[4/3] rounded-2xl md:rounded-3xl overflow-hidden shadow-xl md:shadow-2xl">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/22.png-FjHsCSsScJT76IHTeq7DFobAck45ur.jpeg"
                  alt="Restaurant dining experience"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
              {/* Floating card - hidden on small mobile, visible from sm up */}
              <div className="hidden sm:block absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">You take the payment</p>
                    <p className="text-sm text-gray-500">No commission ever</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Join Section */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why venues join Eatinout
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get discovered by local diners without the cost, complexity or commission of delivery platforms.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mb-6">
                <PoundSterling className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Free to list, no monthly charge</h3>
              <p className="text-gray-600 leading-relaxed">
                No setup fees, no monthly subscription, no hidden costs. Listing your venue on Eatinout is completely free, forever.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Reach local diners ready to visit</h3>
              <p className="text-gray-600 leading-relaxed">
                Eatinout brings you local people actively looking for places to eat out. Not delivery customers - real diners who want to visit your venue.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mb-6">
                <Utensils className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">You keep 100% of the payment</h3>
              <p className="text-gray-600 leading-relaxed">
                Customers pay you directly. No commission, no transaction fees. Change, pause or update your offer whenever you want.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Offer Section */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative aspect-square rounded-3xl overflow-hidden shadow-xl">
                <Image
                  src="/images/restaurant-kitchen.webp"
                  alt="Restaurant kitchen"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-8">
              <div>
                <span className="inline-block px-4 py-1.5 bg-[#DC3545]/10 text-[#DC3545] rounded-full text-sm font-semibold mb-4">
                  The offer restaurants care about
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  No commission. No transaction fees. Full control.
                </h2>
                <p className="text-lg text-gray-600">
                  Unlike delivery platforms, we don&apos;t take a cut of your revenue. You create the offer, you serve the customer, you keep 100% of the payment.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">No commission on sales</p>
                    <p className="text-gray-600">Keep every penny you earn</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">No transaction fees</p>
                    <p className="text-gray-600">Customers pay you directly</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">You control your offer</p>
                    <p className="text-gray-600">Change, pause, or update anytime</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Built for dining out</p>
                    <p className="text-gray-600">Not delivery - real customers visiting your venue</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* You Control The Offer Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Content */}
            <div className="space-y-8">
              <div>
                <span className="inline-block px-4 py-1.5 bg-[#DC3545]/10 text-[#DC3545] rounded-full text-sm font-semibold mb-4">
                  Full flexibility
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  You control the offer
                </h2>
                <p className="text-lg text-gray-600">
                  Create an offer that works for your business — then change it, pause it or update it whenever you need.
                </p>
              </div>

              {/* Benefit points */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="font-medium text-gray-900">Set the days and times</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="font-medium text-gray-900">Add simple terms like bookings only</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="font-medium text-gray-900">Pause or update your offer anytime</p>
                </div>
              </div>
            </div>

            {/* Example Offer Card */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                {/* Card shadow/glow effect */}
                <div className="absolute inset-0 bg-[#DC3545]/20 rounded-3xl blur-2xl transform translate-y-4" />
                
                {/* Main card */}
                <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-w-sm">
                  {/* Card header */}
                  <div className="bg-gradient-to-r from-[#DC3545] to-[#c82333] px-6 py-4">
                    <span className="inline-block px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full uppercase tracking-wide">
                      Example offer
                    </span>
                  </div>
                  
                  {/* Card body */}
                  <div className="p-6 space-y-6">
                    {/* Main offer */}
                    <div className="text-center">
                      <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-2">30% off</h3>
                      <p className="text-xl text-gray-600 font-medium">food</p>
                    </div>
                    
                    {/* Offer details */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                        <Calendar className="w-5 h-5 text-[#DC3545]" />
                        <span className="font-medium text-gray-700">Monday – Thursday</span>
                      </div>
                      <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                        <Clock className="w-5 h-5 text-[#DC3545]" />
                        <span className="font-medium text-gray-700">4pm – 6pm</span>
                      </div>
                      <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                        <BookOpen className="w-5 h-5 text-[#DC3545]" />
                        <span className="font-medium text-gray-700">Bookings only</span>
                      </div>
                    </div>
                    
                    {/* Card footer hint */}
                    <div className="pt-4 border-t border-gray-100 text-center">
                      <p className="text-sm text-gray-500">Your offer. Your rules. Your control.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How it works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Three simple steps to start bringing in more local diners
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#DC3545] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Create your free listing</h3>
              <p className="text-gray-600">
                Sign up and add your venue details, photos, and opening hours. Takes less than 5 minutes.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#DC3545] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Add an offer that suits your business</h3>
              <p className="text-gray-600">
                Create a deal that works for you. Discount a percentage, offer a free item, or design your own promotion.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#DC3545] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Get discovered by diners ready to visit</h3>
              <p className="text-gray-600">
                Your venue appears to local Eatinout members looking for places to eat out. They visit, you serve, you get paid.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button 
              asChild 
              size="lg" 
              className="bg-[#DC3545] hover:bg-[#c82333] text-white text-lg px-8 py-6 rounded-xl"
            >
              <Link href="/join-restaurant">
                Create your free listing
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to know about listing your venue
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div 
                key={index}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
              >
                <button
                  className="w-full px-6 py-5 flex items-center justify-between text-left"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="font-semibold text-gray-900">{item.question}</span>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-500 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} 
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5 text-gray-600">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Capture Form */}
      <section ref={demoFormRef} className="py-20 md:py-28 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Want to see how Eatinout could work for your venue?
            </h2>
            <p className="text-lg text-gray-400">
              Request a callback and we&apos;ll show you how easy it is to get started
            </p>
          </div>

          {submitSuccess ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Thanks for your interest!</h3>
              <p className="text-gray-400">We&apos;ll be in touch soon to arrange your callback.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 md:p-8 shadow-xl">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="venueName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Venue name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="venueName"
                      value={formData.venueName}
                      onChange={handleChange}
                      placeholder="Your restaurant name"
                      className="pl-10 h-12 rounded-xl border-gray-300"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Contact name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={handleChange}
                      placeholder="Your name"
                      className="pl-10 h-12 rounded-xl border-gray-300"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@restaurant.com"
                      className="pl-10 h-12 rounded-xl border-gray-300"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="07XXX XXXXXX"
                      className="pl-10 h-12 rounded-xl border-gray-300"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Town / City
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Preston, Blackpool"
                    className="pl-10 h-12 rounded-xl border-gray-300"
                    required
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Message / Preferred callback time (optional)
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Let us know if there's a good time to call..."
                    className="pl-10 min-h-[100px] rounded-xl border-gray-300 resize-none"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleCheckboxChange}
                    required
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#DC3545] focus:ring-[#DC3545]"
                  />
                  <span className="text-sm text-gray-600">
                    I agree to the{" "}
                    <Link href="/terms" className="text-[#DC3545] hover:underline">
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-[#DC3545] hover:underline">
                      Privacy Policy
                    </Link>
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="acceptMarketing"
                    checked={formData.acceptMarketing}
                    onChange={handleCheckboxChange}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#DC3545] focus:ring-[#DC3545]"
                  />
                  <span className="text-sm text-gray-600">
                    I&apos;d like to receive news, tips and offers from EatinOut by email
                  </span>
                </label>
              </div>

              <Button 
                type="submit" 
                size="lg"
                disabled={isSubmitting}
                className="w-full bg-[#DC3545] hover:bg-[#c82333] text-white text-lg py-6 rounded-xl disabled:opacity-50"
              >
                {isSubmitting ? "Sending..." : "Request a callback"}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28 bg-[#DC3545]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Start getting discovered by local diners
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Free to list. No commission. You take the payment. Change your offer whenever you need.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild 
              size="lg" 
              className="bg-white text-[#DC3545] hover:bg-gray-100 text-lg px-8 py-6 rounded-xl shadow-lg"
            >
              <Link href="/join-restaurant">
                Sign up free now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={scrollToDemo}
              className="border-2 border-white text-white bg-white/10 hover:bg-white hover:text-[#DC3545] text-lg px-8 py-6 rounded-xl"
            >
              Learn more
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
