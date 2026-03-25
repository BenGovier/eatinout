"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TermsPages() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-200 px-0 flex flex-col">
            <Card className="w-full border-0 bg-white/90 rounded-none px-0">
                <CardHeader className="gap-2 pb-0 items-start">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="font-medium">Back</span>
                    </button>
                    <CardTitle className="text-3xl font-bold mb-2 text-left">Terms and Conditions</CardTitle>
                    <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="secondary">Effective Date: 18 June 2025</Badge>
                        <Badge variant="secondary">Company Name: EATINOUT LTD</Badge>
                        <Badge variant="secondary">Registered Number: 15788340</Badge>
                        <Badge variant="secondary">Registered Office: Old Docks House Watery Lane, Ashton-On-Ribble, Preston, PR2 1AU</Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-2 pb-6 px-5 sm:px-8 md:px-16 text-left">
                    <section>
                        <strong className="mt-4 block">1. About Eatinout</strong>
                        Eatinout is a UK-based platform providing exclusive discount codes for use at participating restaurants and food establishments. These Terms govern your use of our website, services, and access to any promotions offered via our platform.
                    </section>
                    <section>
                        <strong className="mt-4 block">2. Acceptance of Terms</strong>
                        By using our website or services, you agree to be bound by these Terms and Conditions. If you do not agree, you must not use the platform.
                    </section>
                    <section>
                        <strong className="mt-4 block">3. User Eligibility</strong>
                        You must be at least 18 years old and reside in the United Kingdom to register or access our services.
                    </section>
                    <section>
                        <strong className="mt-4 block">4. Service Access</strong>
                        Access to discount codes is provided to registered users, subject to availability and eligibility. We reserve the right to update, withdraw or modify codes at our discretion.
                    </section>
                    <section>
                        <strong className="mt-4 block">5. Accuracy of Information</strong>
                        We aim to ensure all information, including discounts and restaurant participation, is accurate. However, we are not liable for errors or changes made by third-party restaurants.
                    </section>
                    <section>
                        <strong className="mt-4 block">6. Use of Discount Codes</strong>
                        Discount codes:
                        <ul className="list-disc pl-6 space-y-1 mt-1">
                            <li>Are subject to terms set by the individual restaurant</li>
                            <li>May not be used in conjunction with other offers</li>
                            <li>May be limited to certain days/times</li>
                            <li>Must not be resold or misused</li>
                        </ul>
                    </section>
                    <section>
                        <strong className="mt-4 block">7. Account and Security</strong>
                        You are responsible for maintaining the confidentiality of your account credentials. Notify us immediately if you suspect any unauthorized access.
                    </section>
                    <section>
                        <strong className="mt-4 block">8. Intellectual Property</strong>
                        All content on the Eatinout website, including logos, text, and software, is owned by or licensed to us. You must not copy, distribute, or exploit content without our permission.
                    </section>
                    <section>
                        <strong className="mt-4 block">9. Limitation of Liability</strong>
                        We are not responsible for:
                        <ul className="list-disc pl-6 space-y-1 mt-1">
                            <li>Any issues with a restaurant's service or food</li>
                            <li>Restaurant refusal to honour a discount due to miscommunication or technical fault</li>
                            <li>Losses arising from misuse of the platform</li>
                        </ul>
                    </section>
                    <section>
                        <strong className="mt-4 block">10. Termination</strong>
                        We reserve the right to suspend or terminate your account if you breach these Terms.
                    </section>
                    <section>
                        <strong className="mt-4 block">11. Changes to These Terms</strong>
                        We may update these Terms periodically. Continued use of our service constitutes your acceptance of any changes.
                    </section>
                    <section>
                        <strong className="mt-4 block">12. Contact</strong>
                        For questions or concerns regarding these Terms, please email: <a href="mailto:support@eatinout.co.uk" className="text-blue-600 underline">support@eatinout.co.uk</a>
                    </section>
                </CardContent>
            </Card>
        </div>
    )
}