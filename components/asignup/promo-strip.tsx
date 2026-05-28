import Link from "next/link"

export function PromoStrip() {
    return (
        <div className="bg-primary">
            <div className="mx-auto max-w-7xl px-4 py-2.5 text-center">
                <Link
                    href="/start"
                    className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-white/90 transition-colors"
                >
                    <span>7 days free – then just £4.99 per month</span>
                </Link>
            </div>
        </div>
    )
}
