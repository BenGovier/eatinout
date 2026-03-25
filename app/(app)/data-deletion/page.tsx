"use client"

import { useEffect } from "react";

export default function DataDeletation() {
  useEffect(() => {
    document.title = "Data Deletion"
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">If you want to delete your data associated with our app, please contact us at [your support email], or navigate to your account settings to request deletion. We will ensure your data is removed from our systems within 48 hours.</h1>
    </div>
  );
}