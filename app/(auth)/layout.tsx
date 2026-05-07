import type React from "react"

import { GoogleTagManager } from "@/components/google-tag-manager"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <GoogleTagManager />
      {children}
    </div>
  )
}

