"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const navLinks = [
    { href: "/", label: "See Offers" },
    { href: "/pricing", label: "Pricing" },
    { href: "/contact", label: "Contact" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/pricing#faq", label: "FAQs" },
]

export function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
                {/* Logo */}
                <Link href="/" className="flex-shrink-0">
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
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* Desktop CTA */}
                <div className="hidden lg:flex lg:items-center lg:gap-4">
                    <Link
                        href="/sign-in"
                        className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
                    >
                        Login / Sign Up
                    </Link>
                    <Link
                        href="/join-restaurant"
                        className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
                    >
                        List a Restaurant
                    </Link>
                    <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6">
                        <Link href="/sign-up">Get 7 days free now!</Link>
                    </Button>
                </div>

                {/* Mobile menu button */}
                <div className="flex lg:hidden items-center gap-3">
                    <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-xs px-4">
                        <a href="https://www.eatinout.com/sign-up">Get 7 days free now!</a>
                    </Button>
                    <button
                        type="button"
                        className="p-2 text-foreground"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </nav>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
                <div className="lg:hidden border-t border-border bg-background">
                    <div className="space-y-1 px-4 py-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="block py-3 text-base font-medium text-foreground/80 hover:text-foreground border-b border-border/50 last:border-0"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <Link
                            href="/sign-in"
                            className="block py-3 text-base font-medium text-foreground/80 hover:text-foreground border-b border-border/50"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Login / Sign Up
                        </Link>
                        <Link
                            href="/join-restaurant"
                            className="block py-3 text-base font-medium text-foreground/80 hover:text-foreground"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            List a Restaurant
                        </Link>
                    </div>
                </div>
            )}
        </header>
    )
}
