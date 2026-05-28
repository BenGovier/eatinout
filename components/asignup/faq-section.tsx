"use client"

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
    {
        question: "Is Eatinout a delivery app?",
        answer: "No. Eatinout is for eating out. You use your member offers at participating restaurants, cafes, bars and venues when you visit in person.",
    },
    {
        question: "How do I use an offer?",
        answer: "Choose an offer in Eatinout, show your member code at the venue when you visit, and the venue applies the offer based on its terms.",
    },
    {
        question: "What happens after the free trial?",
        answer: "After 7 days, membership is £4.99/month unless you cancel. You can cancel anytime before your trial ends.",
    },
    {
        question: "Can I cancel anytime?",
        answer: "Yes. You can cancel your membership anytime with no fees or hassle.",
    },
    {
        question: "What if there are no offers near me?",
        answer: "You can browse all venues and offers before signing up to check availability in your area.",
    },
    {
        question: "Are member offers unlimited?",
        answer: "Members can access all available offers during their membership, subject to each venue&apos;s individual offer terms.",
    },
]

export function FAQSection() {
    return (
        <section id="faq" className="py-12 md:py-20 bg-[#FAF9F7]">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                {/* Header */}
                <div className="text-center mb-10 md:mb-14">
                    <h2 className="text-2xl md:text-4xl font-bold text-[#1C1917]">
                        Frequently asked questions
                    </h2>
                </div>

                {/* FAQ Accordion */}
                <div className="max-w-2xl mx-auto">
                    <Accordion type="single" collapsible className="space-y-3">
                        {faqs.map((faq, index) => (
                            <AccordionItem
                                key={index}
                                value={`item-${index}`}
                                className="bg-white rounded-2xl border border-[#E8E4DF] px-6 data-[state=open]:shadow-sm"
                            >
                                <AccordionTrigger className="text-left text-sm md:text-base font-medium text-[#1C1917] hover:no-underline py-5">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-sm md:text-base text-[#57534E] pb-5">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </div>
        </section>
    )
}
