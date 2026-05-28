import { Check } from "lucide-react"

const benefits = [
    "7 days free to try",
    "£4.99/month after trial",
    "Cancel anytime",
    "500+ venues",
    "Member-only local offers",
]

export function ValueReinforcement() {
    return (
        <section id="pricing" className="py-12 md:py-20 bg-white">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    {/* Main Value Card */}
                    <div className="bg-[#FAF9F7] rounded-3xl p-6 md:p-10 border border-[#E8E4DF]">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl md:text-4xl font-bold text-[#1C1917] mb-4 text-balance">
                                One meal out could cover your monthly membership
                            </h2>
                            <p className="text-base md:text-lg text-[#57534E] text-pretty">
                                After your 7-day free trial, Eatinout is just £4.99/month. Use one good offer and it can pay for itself.
                            </p>
                        </div>

                        {/* Value Calculation */}
                        <div className="bg-white rounded-2xl p-5 md:p-8 shadow-sm border border-[#E8E4DF] mb-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm md:text-base pb-3 border-b border-[#E8E4DF]">
                                    <span className="text-[#57534E]">Two people spend on dinner</span>
                                    <span className="font-semibold text-[#1C1917]">£50</span>
                                </div>
                                <div className="flex items-center justify-between text-sm md:text-base pb-3 border-b border-[#E8E4DF]">
                                    <span className="text-[#57534E]">50% off member offer saves</span>
                                    <span className="font-semibold text-[#16A34A]">-£25</span>
                                </div>
                                <div className="flex items-center justify-between text-sm md:text-base">
                                    <span className="text-[#57534E]">Your membership cost</span>
                                    <span className="font-semibold text-[#1C1917]">£4.99/month</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-[#E8E4DF] text-center">
                                <p className="text-lg md:text-xl font-bold text-[#1C1917]">
                                    That&apos;s around <span className="text-[#DC3545]">5x</span> the monthly cost saved in one meal
                                </p>
                            </div>
                        </div>

                        {/* Benefits List */}
                        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
                            {benefits.map((benefit, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-[#16A34A]/10 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-[#16A34A]" />
                                    </div>
                                    <span className="text-sm text-[#57534E]">{benefit}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
