"use client"

import Script from "next/script"

/** Set `NEXT_PUBLIC_GTM_ID` in env, or omit to use the default container. */
const rawGtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim() || "GTM-KR2NK8KD"
const GTM_ID = /^GTM-[A-Z0-9]+$/i.test(rawGtmId) ? rawGtmId : "GTM-KR2NK8KD"

/**
 * Loads GTM only where this component is rendered. Add it to a route `layout.tsx`
 * or a specific `page.tsx` instead of injecting globally from the root layout.
 */
export function GoogleTagManager() {
  if (!GTM_ID) {
    return null
  }

  return (
    <>
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;
j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');
`,
        }}
      />
      <noscript>
        <iframe
          title="Google Tag Manager"
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  )
}
