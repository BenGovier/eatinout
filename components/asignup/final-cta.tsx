import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function FinalCTA() {
    return (
        <section className="py-12 md:py-20 bg-[#1C1917]">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 text-balance">
                        Ready to save when you eat out?
                    </h2>
                    <p className="text-[#A8A29E] text-base md:text-lg mb-8 text-pretty">
                        Start with 7 days free. After that, it&apos;s just £4.99/month. Cancel anytime.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button asChild className="bg-[#DC3545] hover:bg-[#C82333] text-white rounded-full px-8 py-6 text-base font-semibold shadow-lg shadow-[#DC3545]/20">
                            <Link href="/start">
                                Start 7 days free
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="rounded-full px-8 py-6 text-base font-medium border-white/20 bg-transparent hover:bg-white/10 text-white">
                            <Link href="/restaurants">Browse restaurants</Link>
                        </Button>
                    </div>
                    <p className="text-xs text-[#78716C] mt-6">
                        7 days free, then £4.99/month. Cancel anytime.
                    </p>
                </div>
            </div>
        </section>
    )
}
