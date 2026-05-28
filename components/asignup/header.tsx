"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const navLinks = [
    { href: "https://www.eatinout.com", label: "See Offers" },
    { href: "#pricing", label: "Pricing" },
    { href: "#how-it-works", label: "How It Works" },
    { href: "#faq", label: "FAQs" },
]

export function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <header className="sticky top-0 z-50 w-full bg-[#FEFCF9]/95 backdrop-blur-md border-b border-[#E8E4DF]">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
                {/* Logo */}
                <Link href="/asignup" className="flex-shrink-0">
                    <Image
                        src="/images/eatinoutlogo.webp"
                        alt="Eatinout"
                        width={140}
                        height={36}
                        className="h-8 w-auto"
                        priority
                    />
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden lg:flex lg:items-center lg:gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-sm font-medium text-[#57534E] transition-colors hover:text-[#1C1917]"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                {/* Desktop CTA */}
                <div className="hidden lg:flex lg:items-center lg:gap-4">
                    <Link
                        href="/sign-in"
                        className="text-sm font-medium text-[#57534E] transition-colors hover:text-[#1C1917]"
                    >
                        Login / Sign Up
                    </Link>
                    <Button asChild className="bg-[#DC3545] hover:bg-[#C82333] text-white rounded-full px-6 shadow-sm">
                        <Link href="/start">Start 7 days free</Link>
                    </Button>
                </div>

                {/* Mobile menu button */}
                <div className="flex lg:hidden items-center gap-3">
                    <Button asChild size="sm" className="bg-[#DC3545] hover:bg-[#C82333] text-white rounded-full text-xs px-4 shadow-sm">
                        <Link href="/start">Start free</Link>
                    </Button>
                    <button
                        type="button"
                        className="p-2 text-[#1C1917]"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </nav>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
                <div className="lg:hidden border-t border-[#E8E4DF] bg-[#FEFCF9]">
                    <div className="space-y-1 px-4 py-4">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="block py-3 text-base font-medium text-[#57534E] hover:text-[#1C1917] border-b border-[#E8E4DF]/50 last:border-0"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.label}
                            </a>
                        ))}
                        <Link
                            href="/sign-in"
                            className="block py-3 text-base font-medium text-[#57534E] hover:text-[#1C1917]"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Login / Sign Up
                        </Link>
                    </div>
                </div>
            )}
        </header>
    )
}
