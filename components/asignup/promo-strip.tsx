import Link from "next/link"
import { Ticket } from "lucide-react"

export function PromoStrip() {
    return (
        <div className="bg-[#1C1917]">
            <div className="mx-auto max-w-7xl px-4 py-2.5 text-center">
                <Link
                    href="/start"
                    className="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition-colors"
                >
                    <Ticket className="h-3.5 w-3.5 text-[#DC3545]" />
                    <span>Lancashire&apos;s eating out membership — 7 days free, then £4.99/month</span>
                </Link>
            </div>
        </div>
    )
}
