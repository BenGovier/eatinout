// app/providers.tsx
'use client'

import { ThemeProvider } from "@/components/theme-provider"
import ToastWrapper from "@/components/ToastContainer"
import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import LocationConsentProvider from "@/components/location-consent-provider"
import UserLocationSessionCleanup from "@/components/user-location-session-cleanup"

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <SessionProvider>
      <UserLocationSessionCleanup />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ToastWrapper />
          <LocationConsentProvider>{children}</LocationConsentProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
