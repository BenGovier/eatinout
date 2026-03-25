"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
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
          <CardTitle className="text-3xl font-bold mb-2 text-left">Privacy Policy</CardTitle>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="secondary">Effective Date: 18 June 2025</Badge>
            <Badge variant="secondary">Company Name: EATINOUT LTD</Badge>
            <Badge variant="secondary">Registered Number: 15788340</Badge>
            <Badge variant="secondary">Registered Office: Old Docks House Watery Lane, Ashton-On-Ribble, Preston, PR2 1AU</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-6 px-5 sm:px-8 md:px-16 text-left">
          <section>
            <strong className="mt-4 block">1. Introduction</strong>
            We are committed to protecting your personal data. This policy explains how we collect, use, and protect your information when you use our website and services.
          </section>
          <section>
            <strong className="mt-4 block">2. What Data We Collect</strong>
            We may collect the following:
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Name and contact details</li>
              <li>Email address</li>
              <li>Login credentials</li>
              <li>Location (general or postcode-based)</li>
              <li>Restaurant preferences or usage behaviour</li>
              <li>Technical data (IP address, browser type)</li>
            </ul>
          </section>
          <section>
            <strong className="mt-4 block">3. How We Use Your Data</strong>
            Your data is used to:
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Provide access to discount codes</li>
              <li>Send confirmation or promotional emails</li>
              <li>Improve user experience and our platform</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>
          <section>
            <strong className="mt-4 block">4. Legal Bases for Processing</strong>
            We rely on the following legal bases:
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Consent (e.g., marketing emails)</li>
              <li>Contract (providing you access to services)</li>
              <li>Legitimate interests (service improvement)</li>
              <li>Legal compliance</li>
            </ul>
          </section>
          <section>
            <strong className="mt-4 block">5. Sharing Your Data</strong>
            We do not sell your data. We may share limited data with:
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Restaurants for tracking code usage</li>
              <li>Payment or subscription providers</li>
              <li>IT and hosting service providers</li>
              <li>Legal authorities if required</li>
            </ul>
          </section>
          <section>
            <strong className="mt-4 block">6. Data Retention</strong>
            We retain data as long as necessary for the purpose collected or as legally required.
          </section>
          <section>
            <strong className="mt-4 block">7. Your Rights</strong>
            Under UK GDPR, you have rights to:
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Access the data we hold about you</li>
              <li>Request correction or deletion</li>
              <li>Object to processing</li>
              <li>Withdraw consent at any time</li>
              <li>Complain to the ICO</li>
            </ul>
          </section>
          <section>
            <strong className="mt-4 block">8. Data Security</strong>
            We implement appropriate technical and organisational measures to protect your personal information.
          </section>
          <section>
            <strong className="mt-4 block">9. Cookies</strong>
            Our website uses cookies to improve functionality and user experience. You may manage cookie preferences through your browser settings.
          </section>
          <section>
            <strong className="mt-4 block">10. Third-Party Links</strong>
            Our platform may contain links to restaurant websites. We are not responsible for their privacy practices.
          </section>
          <section>
            <strong className="mt-4 block">11. Contact</strong>
            For privacy-related inquiries or to exercise your data rights, contact:
            <div className="mt-2">
              <span role="img" aria-label="email">📧</span>{" "}
              <a href="mailto:privacy@eatinout.co.uk" className="text-blue-600 underline">privacy@eatinout.co.uk</a>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}