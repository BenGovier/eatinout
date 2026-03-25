"use client"

import { useEffect } from "react";

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = "Privacy Policy"
  }, [])

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      </div>
    );
  }