"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const GA_MEASUREMENT_ID = "G-4VQMDHQ5WN";
const CONSENT_KEY = "qrzmail-cookie-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const isFirstPath = useRef(true);
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setHasConsent(localStorage.getItem(CONSENT_KEY) === "analytics");
      } catch {
        setHasConsent(false);
      }
    }, 0);

    function handleConsentChange(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      setHasConsent(detail === "analytics");
    }

    window.addEventListener("qrzmail-analytics-consent", handleConsentChange);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("qrzmail-analytics-consent", handleConsentChange);
    };
  }, []);

  useEffect(() => {
    if (!hasConsent || isFirstPath.current) {
      isFirstPath.current = false;
      return;
    }

    window.gtag?.("config", GA_MEASUREMENT_ID, {
      page_path: pathname,
    });
  }, [hasConsent, pathname]);

  if (!hasConsent) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
