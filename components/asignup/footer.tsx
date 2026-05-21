import Link from "next/link"
import Image from "next/image"
import { Instagram, Facebook } from "lucide-react"

const footerLinks = {
    company: {
        title: "Company",
        links: [
            { label: "About us", href: "/about" },
            { label: "How Eatinout works", href: "/how-it-works" },
            { label: "For restaurants", href: "/for-restaurants" },
            { label: "Businesses", href: "https://corporate.eatinout.co.uk/" },
        ],
    },
    support: {
        title: "Support",
        links: [
            { label: "Contact us", href: "/contact" },
            { label: "Offer terms", href: "/terms" },
            { label: "Membership terms", href: "/terms" },
            { label: "FAQ", href: "/pricing#faq" },
        ],
    },
    legal: {
        title: "Legal",
        links: [
            { label: "Terms of use", href: "/terms" },
            { label: "Privacy policy", href: "/privacy" },
            { label: "Cookies", href: "/privacy" },
        ],
    },
}

const socialLinks = [
    { label: "Instagram", href: "https://instagram.com/eatinout", icon: Instagram },
    { label: "Facebook", href: "https://facebook.com/eatinout", icon: Facebook },
    {
        label: "TikTok",
        href: "https://tiktok.com/@eatinout",
        icon: () => (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
            </svg>
        )
    },
]

export function Footer() {
    return (
        <footer className="bg-foreground text-background">
            <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14">
                {/* App Download Section */}
                <div className="mb-10 pb-10 border-b border-background/10">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-1">Take Eatinout with you</h3>
                            <p className="text-sm text-background/70">Find great dining offers on the go.</p>
                        </div>
                        <div className="flex gap-3">
                            <Link
                                href="https://apps.apple.com/app/eatinout"
                                className="inline-block"
                                aria-label="Download on the App Store"
                            >
                                <div className="flex items-center gap-2 bg-background/10 hover:bg-background/20 transition-colors rounded-lg px-3.5 py-2">
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                                    </svg>
                                    <div className="text-left">
                                        <div className="text-[10px] leading-none opacity-70">Download on the</div>
                                        <div className="text-sm font-semibold leading-tight">App Store</div>
                                    </div>
                                </div>
                            </Link>
                            <Link
                                href="https://play.google.com/store/apps/details?id=com.eatinout"
                                className="inline-block"
                                aria-label="Get it on Google Play"
                            >
                                <div className="flex items-center gap-2 bg-background/10 hover:bg-background/20 transition-colors rounded-lg px-3.5 py-2">
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 9.99l-2.302 2.302-8.634-8.634z" />
                                    </svg>
                                    <div className="text-left">
                                        <div className="text-[10px] leading-none opacity-70">Get it on</div>
                                        <div className="text-sm font-semibold leading-tight">Google Play</div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer Links Grid */}
                <div className="grid grid-cols-2 gap-8 md:grid-cols-3 mb-10">
                    {Object.values(footerLinks).map((section) => (
                        <div key={section.title}>
                            <h4 className="text-sm font-semibold mb-4 text-background/90">{section.title}</h4>
                            <ul className="space-y-2.5">
                                {section.links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-background/60 hover:text-background transition-colors"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom Section */}
                <div className="pt-8 border-t border-background/10">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        {/* Logo and Copyright */}
                        <div className="flex flex-col gap-3">
                            <Image
                                src="/images/eatinouticon.webp"
                                alt="Eatinout"
                                width={36}
                                height={36}
                                className="h-9 w-9"
                            />
                            <p className="text-sm text-background/60">
                                © 2026 Eatinout. All rights reserved.
                            </p>
                        </div>

                        {/* Social Links */}
                        <div className="flex gap-4">
                            {socialLinks.map((social) => {
                                const Icon = social.icon
                                return (
                                    <Link
                                        key={social.label}
                                        href={social.href}
                                        className="text-background/60 hover:text-background transition-colors"
                                        aria-label={social.label}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
