"use client"

import { useState, useEffect } from "react"
import { Search, Lightbulb, HelpCircle, Lock, Building2, Tag, Phone } from "lucide-react"
import { useRouter } from "next/navigation"

export function AnimatedBurgerMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [showPeek, setShowPeek] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPeek(true)
      setTimeout(() => setShowPeek(false), 600)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.body.style.overflow = "hidden"

    document.addEventListener("keydown", handleEsc)
    return () => {
      document.removeEventListener("keydown", handleEsc)
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const menuItems = [
    { icon: Search, label: "See Offers", variant: "primary" as const, href: "/" },
    { icon: Tag, label: "Pricing", variant: "default" as const, href: "/pricing" },
    { icon: Phone, label: "Contact", variant: "default" as const, href: "/contact" },
    { icon: Lightbulb, label: "How It Works", variant: "default" as const, href: "/how-it-works" },
    { icon: HelpCircle, label: "FAQ's", variant: "default" as const, href: "/pricing#faq" },
    { icon: Lock, label: "Login / Sign Up", variant: "link" as const, href: "/sign-up" },
    { icon: Building2, label: "List a Restaurant", variant: "outline" as const, href: "/join-restaurant" },
  ]

  const handleMenuClick = (href: string) => {
    setIsOpen(false)
    if (href.startsWith("#")) {
      setTimeout(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })
      }, 300)
    } else {
      setTimeout(() => {
        router.push(href)
      }, 300)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-2 group z-50 transition-transform duration-200 hover:scale-110 active:scale-95 outline-none focus:outline-none focus-visible:outline-none"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
      >
        <div className="flex flex-col items-center justify-center gap-1.5 w-10 h-10">
          <span
            className={`w-6 h-0.5 transition-all duration-300 ease-out ${
              isOpen ? "rotate-45 translate-y-2 bg-[#0F172A]" : "bg-primary"
            } ${!isOpen && "group-hover:bg-primary/80"} ${showPeek && !isOpen ? "translate-x-0.5" : ""}`}
          />
          <span
            className={`w-6 h-0.5 transition-all duration-300 ease-out ${
              isOpen ? "opacity-0" : "opacity-100 bg-primary"
            } ${!isOpen && "group-hover:bg-primary/80"} ${showPeek && !isOpen ? "translate-x-0.5" : ""}`}
          />
          <span
            className={`w-6 h-0.5 transition-all duration-300 ease-out ${
              isOpen ? "-rotate-45 -translate-y-2 bg-[#0F172A]" : "bg-primary"
            } ${!isOpen && "group-hover:bg-primary/80"} ${showPeek && !isOpen ? "translate-x-0.5" : ""}`}
          />
        </div>
        {!isOpen && (
          <span className="text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors duration-200">
            Menu
          </span>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Menu Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 md:bottom-auto md:h-auto w-80 max-w-[85vw] bg-gradient-to-b from-white to-[#F8FAFC] z-40 shadow-2xl transition-all duration-300 ease-out ${
          isOpen
            ? "translate-x-0 md:translate-y-0 opacity-100"
            : "translate-x-full md:translate-x-0 md:-translate-y-full opacity-0"
        } md:rounded-bl-2xl`}
        role="dialog"
        aria-label="Navigation menu"
      >
        <div className="p-6 space-y-3 mt-16 md:mt-6">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            const isFirstItem = index === 0
            const isLoginItem = item.label === "Login / Sign Up"
            const isListRestaurant = item.label === "List a Restaurant"

            return (
              <button
                key={item.label}
                onClick={() => handleMenuClick(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ease-out text-left border ${
                  isFirstItem
                    ? "bg-primary hover:bg-primary/90 text-white border-primary font-semibold shadow-md"
                    : isLoginItem
                      ? "text-primary hover:bg-primary/5 border-transparent font-semibold underline"
                      : isListRestaurant
                        ? "border-2 border-primary text-primary hover:bg-primary/5 font-semibold"
                        : "text-[#475569] hover:bg-accent border-transparent hover:scale-[1.03]"
                }`}
                style={{
                  animationDelay: `${index * 80}ms`,
                  animation: isOpen ? "fadeInStagger 300ms ease-out forwards" : "none",
                  opacity: isOpen ? 1 : 0,
                }}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className={isFirstItem || isLoginItem || isListRestaurant ? "font-semibold" : "font-medium"}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInStagger {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}
