// app/layout.tsx (Server Component)
import { Inter } from "next/font/google"
import "./globals.css"
import Providers from "./provider"
import "react-datepicker/dist/react-datepicker.css"
import Script from "next/script"
import { AuthProvider } from "@/context/auth-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: 'Eatinout',
  description: 'Eatinout',
  icons: {
    icon: '/images/eatinouticon.webp',
    shortcut: '/images/eatinouticon.webp',
    apple: '/images/eatinouticon.webp',
  },
  generator: "v0.dev",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Tag Manager */}
        <Script
          id="gtm-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;
              j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
              f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-KR2NK8KD');
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({
                'event': 'gtm_verification',
                'message': 'GTM is successfully loaded on EatinOut!'
              });
            `,
          }}
        />
        {/* End Google Tag Manager */}
      </head>
      <body className={inter.className}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe 
            src="https://www.googletagmanager.com/ns.html?id=GTM-KR2NK8KD"
            height="0" 
            width="0" 
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
         <AuthProvider>
        <Providers>{children}</Providers>
        </AuthProvider>
        
        {/* Rewardful Script */}
        <Script src="https://r.wdfl.co/rw.js" data-rewardful="bb966a" />
        <Script id="rewardful-queue" strategy="beforeInteractive">
          {`(function(w,r){w._rwq=r;w[r]=w[r]||function(){(w[r].q=w[r].q||[]).push(arguments)}})(window,'rewardful');`}
        </Script>
      </body>
    </html>
  )
}
