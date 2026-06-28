"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_KEY = "qrzmail-cookie-consent";
type CookieConsent = "essential" | "analytics";

export default function CookieNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setIsVisible(localStorage.getItem(CONSENT_KEY) === null);
      } catch {
        setIsVisible(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function chooseConsent(consent: CookieConsent) {
    try {
      localStorage.setItem(CONSENT_KEY, consent);
    } catch {
      // If localStorage is unavailable, still let the user close the notice.
    }
    window.dispatchEvent(new CustomEvent("qrzmail-analytics-consent", { detail: consent }));
    setIsVisible(false);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <aside className="cookie-notice" aria-label="Cookie notice">
      <div className="cookie-notice-copy">
        <strong>Cookies on QRZMail</strong>
        <span>
          We use essential cookies for sign-in and security. With your permission,
          Google Analytics helps us understand site usage.
        </span>
      </div>
      <div className="cookie-notice-actions">
        <Link className="button ghost small" href="/privacy">
          Privacy Policy
        </Link>
        <button className="button ghost small" type="button" onClick={() => chooseConsent("essential")}>
          Essential only
        </button>
        <button className="button primary small" type="button" onClick={() => chooseConsent("analytics")}>
          Allow analytics
        </button>
      </div>
    </aside>
  );
}
