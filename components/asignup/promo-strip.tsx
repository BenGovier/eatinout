import Link from "next/link"

export function PromoStrip() {
    return (
        <div className="bg-background border-b border-primary/15">
            <div className="mx-auto max-w-7xl px-4 py-2.5 text-center">
                <Link
                    href="/start"
                    className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                    <span>30 days free – then just £4.99 per month</span>
                </Link>
            </div>
        </div>
    )
}
