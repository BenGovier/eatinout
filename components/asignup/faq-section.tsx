"use client"

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
    {
        question: "Is EatinOut a delivery app?",
        answer: "No. EatinOut is for dining out. You use it at participating restaurants, cafes, bars and venues.",
    },
    {
        question: "How do I use an offer?",
        answer: "Choose an offer in EatinOut, show your code at the venue, and the venue applies the offer based on its terms.",
    },
    {
        question: "What happens after the free trial?",
        answer: "After 30 days, membership is £4.99/month unless you cancel.",
    },
    {
        question: "Can I cancel anytime?",
        answer: "Yes. You can cancel your membership anytime.",
    },
    {
        question: "What if there are no offers near me?",
        answer: "You can check where you can save before committing.",
    },
    {
        question: "Are offers unlimited?",
        answer: "Members can access available offers during their membership, subject to each venue's offer terms.",
    },
]

export function FAQSection() {
    return (
        <section id="faq" className="py-10 md:py-14 bg-secondary/30">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                {/* Header */}
                <div className="text-center mb-8 md:mb-10">
                    <h2 className="text-2xl md:text-4xl font-bold text-foreground">
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
                                className="bg-card rounded-xl border border-border/50 px-6 data-[state=open]:shadow-sm"
                            >
                                <AccordionTrigger className="text-left text-sm md:text-base font-medium text-foreground hover:no-underline py-4">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-sm md:text-base text-muted-foreground pb-4">
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
