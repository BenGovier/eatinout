import Link from "next/link"

const links = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
]

export function PrestonFooter() {
  return (
    <footer className="border-t border-black/5 bg-white pb-28 pt-10 sm:pb-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5">
        {/* Prominent, always-visible link to the M&S gift card promotion terms */}
        <Link
          href="/mands/terms"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--eo-gold-dark)]/40 bg-[var(--eo-gold)]/10 px-4 py-1.5 text-sm font-semibold text-[var(--eo-gold-dark)] transition-colors hover:bg-[var(--eo-gold)]/20"
        >
          Read the £25 M&amp;S Gift Card terms &amp; conditions
        </Link>

        <div className="flex w-full flex-col items-center gap-5 sm:flex-row sm:justify-between">
          <p className="text-sm text-[var(--eo-muted)]">
            © {new Date().getFullYear()} EatinOut. All rights reserved.
          </p>
          <nav className="flex items-center gap-6" aria-label="Footer">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[var(--eo-muted)] transition-colors hover:text-[var(--eo-ink)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
