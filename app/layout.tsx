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
    <html lang="en">
      <head>
        {/* Meta Pixel */}
        <Script
          id="fb-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1503053058273897');
fbq('track', 'PageView');
            `,
          }}
        />
        {/* End Meta Pixel */}
      </head>
      <body className={inter.className}>
        {/* Meta Pixel (noscript) */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1503053058273897&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {/* End Meta Pixel (noscript) */}
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
