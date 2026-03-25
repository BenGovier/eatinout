"use client"

import { Search, Smartphone, Receipt, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function HowItWorksPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-12 pb-8 bg-white relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/luxury-gourmet-food-platter-fine-dining-elegant-pr.webp"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/90 to-white/95" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-12 text-balance">
            Eating Out For Less is as Easy as 1, 2, 3...
          </h1>

          <div className="grid md:grid-cols-3 gap-8 md:gap-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#FFF1F2] border-2 border-primary flex items-center justify-center mb-4 shadow-md">
                <Search className="h-9 w-9 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-3">Find Your Deal</h3>
              <p className="text-[#64748B] leading-relaxed">
                Browse 1,000s of instant offers, with up to 50% off at 400+ local restaurants.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#FFF1F2] border-2 border-primary flex items-center justify-center mb-4 shadow-md">
                <Smartphone className="h-9 w-9 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-3">Get Your Code</h3>
              <p className="text-[#64748B] leading-relaxed">
                No booking needed. Just get your offer code to get your instant digital code.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#FFF1F2] border-2 border-primary flex items-center justify-center mb-4 shadow-md">
                <Receipt className="h-9 w-9 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-3">Show & Save</h3>
              <p className="text-[#64748B] leading-relaxed">
                Show your code at the restaurant to get your discount. It's that simple.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-8 pb-4 bg-[#F8FAFC]">
        <h2 className="text-3xl font-bold text-[#0F172A] text-center">It's All Inside The App</h2>
      </div>

      <div className="px-4 py-8 pb-12 max-w-6xl mx-auto bg-[#F8FAFC]">
        <div className="md:hidden overflow-x-auto snap-x snap-mandatory -mx-4 px-4">
          <div className="flex gap-6 pb-4">
            <div className="flex-shrink-0 w-[280px] snap-center">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-[200px] h-[400px] bg-gradient-to-b from-gray-900 to-gray-800 rounded-[2.5rem] p-3 shadow-2xl">
                    <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden">
                      <img
                        // src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1%20Browse-eH1DLfVj8NaaXCioFpMkuU0jceyROH.png"
                        src="https://eatinoutstorage.blob.core.windows.net/eatinout/how-it_1772098836223_zgv2f.webp"
                        alt="Browse offers on phone"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#0F172A] mb-2">Browse</div>
                <div className="text-base text-[#64748B]">Discover amazing offers</div>
              </div>
            </div>

            <div className="flex-shrink-0 w-[280px] snap-center">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-[200px] h-[400px] bg-gradient-to-b from-gray-900 to-gray-800 rounded-[2.5rem] p-3 shadow-2xl">
                    <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden">
                      <img
                        // src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2%20Subscribe-w3mxcT4fGPfV8VfCh7kIWp4U389Tgz.png"
                        src="https://eatinoutstorage.blob.core.windows.net/eatinout/how-i-s_1772100393046_l5hjf.webp"
                        alt="Subscribe and add to wallet"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#0F172A] mb-2">Subscribe</div>
                <div className="text-base text-[#64748B]">Start your free trial</div>
              </div>
            </div>

            <div className="flex-shrink-0 w-[280px] snap-center">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-[200px] h-[400px] bg-gradient-to-b from-gray-900 to-gray-800 rounded-[2.5rem] p-3 shadow-2xl">
                    <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden">
                      <img
                        // src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3.%20Save-nIm8AHneXZmoiFEKDmOauhplrMHEVr.png"
                        src="https://eatinoutstorage.blob.core.windows.net/eatinout/how-i-d_1772100166463_wqtq0.webp"
                        alt="Show code and save"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#0F172A] mb-2">Save</div>
                <div className="text-base text-[#64748B]">Enjoy your discount</div>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:grid grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center animate-fade-in-stagger-1">
            <div className="relative mb-6">
              <div className="w-[200px] h-[400px] bg-gradient-to-b from-gray-900 to-gray-800 rounded-[2.5rem] p-3 shadow-2xl">
                <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden">
                  <img
                    // src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1%20Browse-eH1DLfVj8NaaXCioFpMkuU0jceyROH.png"
                    src="https://eatinoutstorage.blob.core.windows.net/eatinout/how-it_1772098836223_zgv2f.webp"
                    alt="Browse offers on phone"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0F172A] mb-2">Browse</div>
            <div className="text-base text-[#64748B]">Discover amazing offers</div>
          </div>

          <div className="flex flex-col items-center text-center animate-fade-in-stagger-2">
            <div className="relative mb-6">
              <div className="w-[200px] h-[400px] bg-gradient-to-b from-gray-900 to-gray-800 rounded-[2.5rem] p-3 shadow-2xl">
                <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden">
                  <img
                    // src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2%20Subscribe-w3mxcT4fGPfV8VfCh7kIWp4U389Tgz.png"
                    src="https://eatinoutstorage.blob.core.windows.net/eatinout/how-i-s_1772100393046_l5hjf.webp"
                    alt="Subscribe and add to wallet"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0F172A] mb-2">Subscribe</div>
            <div className="text-base text-[#64748B]">Start your free trial</div>
          </div>

          <div className="flex flex-col items-center text-center animate-fade-in-stagger-3">
            <div className="relative mb-6">
              <div className="w-[200px] h-[400px] bg-gradient-to-b from-gray-900 to-gray-800 rounded-[2.5rem] p-3 shadow-2xl">
                <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden">
                  <img
                    // src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3.%20Save-nIm8AHneXZmoiFEKDmOauhplrMHEVr.png"
                    src="https://eatinoutstorage.blob.core.windows.net/eatinout/how-i-d_1772100166463_wqtq0.webp"
                    alt="Show code and save"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0F172A] mb-2">Save</div>
            <div className="text-base text-[#64748B]">Enjoy your discount</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-12 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-[#0F172A] mb-2 text-center"> Our Members Save Hundreds</h2>
          <p className="text-[#64748B] text-center mb-8">Join thousands of happy diners saving money every day</p>

          <div className="md:hidden overflow-x-auto snap-x snap-mandatory -mx-4 px-4">
            <div className="flex gap-4 pb-4">
              <div className="flex-shrink-0 w-[300px] snap-center bg-[#F8FAFC] rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src="/testimonial-sarah-johnson.webp"
                    alt="Sarah Johnson"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-[#0F172A]">Sarah Johnson</div>
                    <div className="text-sm text-[#64748B]">Preston</div>
                  </div>
                </div>
                <div className="text-yellow-500 mb-2">★★★★★</div>
                <p className="text-sm text-[#475569] leading-relaxed">
                  "We've saved over £200 in just two months! The number of offers is amazing and the restaurants are all
                  top-taste."
                </p>
              </div>

              <div className="flex-shrink-0 w-[300px] snap-center bg-[#F8FAFC] rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src="/testimonial-james-williams.webp"
                    alt="James Williams"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-[#0F172A]">James Williams</div>
                    <div className="text-sm text-[#64748B]">Blackpool</div>
                  </div>
                </div>
                <div className="text-yellow-500 mb-2">★★★★★</div>
                <p className="text-sm text-[#475569] leading-relaxed">
                  "Best subscription I've ever had. The variety of restaurants is incredible and the app is so easy to
                  use. Highly recommend!"
                </p>
              </div>

              <div className="flex-shrink-0 w-[300px] snap-center bg-[#F8FAFC] rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src="/testimonial-emma-davies.webp"
                    alt="Emma Davies"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-[#0F172A]">Emma Davies</div>
                    <div className="text-sm text-[#64748B]">Bolton</div>
                  </div>
                </div>
                <div className="text-yellow-500 mb-2">★★★★★</div>
                <p className="text-sm text-[#475569] leading-relaxed">
                  "My family eats out every week and Eatinout has made it so much more affordable. The kids love trying
                  new places too!"
                </p>
              </div>

              <div className="flex-shrink-0 w-[300px] snap-center bg-[#F8FAFC] rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src="/testimonial-michael-brown.webp"
                    alt="Michael Brown"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-[#0F172A]">Michael Brown</div>
                    <div className="text-sm text-[#64748B]">Preston</div>
                  </div>
                </div>
                <div className="text-yellow-500 mb-2">★★★★★</div>
                <p className="text-sm text-[#475569] leading-relaxed">
                  "Great value for money. I've discovered so many amazing restaurants I wouldn't have tried otherwise.
                  Worth every penny!"
                </p>
              </div>
            </div>
          </div>

          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#F8FAFC] rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/testimonial-sarah-johnson.webp"
                  alt="Sarah Johnson"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-[#0F172A]">Sarah Johnson</div>
                  <div className="text-sm text-[#64748B]">Preston</div>
                </div>
              </div>
              <div className="text-yellow-500 mb-2">★★★★★</div>
              <p className="text-sm text-[#475569] leading-relaxed">
                "We've saved over £200 in just two months! The number of offers is amazing and the restaurants are all
                top-taste."
              </p>
            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/testimonial-james-williams.webp"
                  alt="James Williams"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-[#0F172A]">James Williams</div>
                  <div className="text-sm text-[#64748B]">Blackpool</div>
                </div>
              </div>
              <div className="text-yellow-500 mb-2">★★★★★</div>
              <p className="text-sm text-[#475569] leading-relaxed">
                "Best subscription I've ever had. The variety of restaurants is incredible and the app is so easy to
                use. Highly recommend!"
              </p>
            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/testimonial-emma-davies.webp"
                  alt="Emma Davies"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-[#0F172A]">Emma Davies</div>
                  <div className="text-sm text-[#64748B]">Bolton</div>
                </div>
              </div>
              <div className="text-yellow-500 mb-2">★★★★★</div>
              <p className="text-sm text-[#475569] leading-relaxed">
                "My family eats out every week and Eatinout has made it so much more affordable. The kids love trying
                new places too!"
              </p>
            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/testimonial-michael-brown.webp"
                  alt="Michael Brown"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-[#0F172A]">Michael Brown</div>
                  <div className="text-sm text-[#64748B]">Preston</div>
                </div>
              </div>
              <div className="text-yellow-500 mb-2">★★★★★</div>
              <p className="text-sm text-[#475569] leading-relaxed">
                "Great value for money. I've discovered so many amazing restaurants I wouldn't have tried otherwise.
                Worth every penny!"
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-12 text-center bg-[#F8FAFC]">
        <h2 className="text-2xl font-bold text-[#0F172A] mb-6">Ready to start saving?</h2>
        <Link href="/sign-up">
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white font-bold uppercase px-12 py-6 text-lg rounded-full transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              boxShadow: "0 4px 12px rgba(255, 59, 48, 0.25)",
            }}
          >
            START FREE TRIAL
          </Button>
        </Link>
        <p className="mt-4 text-[#64748B] text-sm">Then only £4.99/month. Cancel anytime.</p>
      </div>
    </div>
  )
}
