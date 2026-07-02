import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import CookieNotice from "./components/cookie-notice";
import GoogleAnalytics from "./components/google-analytics";
import NavUser from "./components/nav-user";
import ThemeToggle from "./components/theme-toggle";

const siteUrl = "https://qrzmail.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "QRZMail – Secure Webmail & Custom Domain Email Hosting",
    template: "%s | QRZMail",
  },
  description:
    "QRZMail provides fast, private webmail for qrzmail.com addresses and custom domain email hosting with IMAP, SMTP, calendar, contacts, and full DNS management including SPF, DKIM & DMARC.",
  applicationName: "QRZMail",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  keywords: [
    "QRZMail",
    "webmail",
    "custom domain email",
    "qrzmail.com email",
    "free email hosting",
    "business email hosting",
    "IMAP email",
    "SMTP email",
    "DKIM email authentication",
    "SPF record",
    "DMARC",
    "secure webmail",
    "private email",
    "domain email hosting",
    "email for small business",
    "mailbox hosting",
    "email aliases",
    "SOGo webmail",
    "email DNS management",
  ],
  authors: [{ name: "QRZMail" }],
  creator: "QRZMail",
  publisher: "QRZMail",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "QRZMail – Secure Webmail & Custom Domain Email Hosting",
    description:
      "Fast, private webmail for qrzmail.com and your own domain. Includes IMAP/SMTP, calendar, contacts, and full DNS authentication (SPF, DKIM, DMARC).",
    url: siteUrl,
    siteName: "QRZMail",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "QRZMail – Secure Webmail & Domain Email Hosting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QRZMail – Secure Webmail & Custom Domain Email Hosting",
    description:
      "Fast, private webmail for qrzmail.com and your own domain. IMAP/SMTP, calendar, contacts, and DNS authentication.",
    images: ["/og-image.png"],
    creator: "@qrzmail",
  },
  alternates: {
    canonical: siteUrl,
  },
  appleWebApp: {
    capable: true,
    title: "QRZMail",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "google-site-verification": "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "QRZMail",
    url: siteUrl,
    description:
      "Fast, private webmail for qrzmail.com addresses and custom domain email hosting with IMAP, SMTP, calendar, contacts, and full DNS authentication.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "QRZMail",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    sameAs: [
      "https://twitter.com/qrzmail",
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Restore saved theme before paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('qrzmail-theme');
                  if (t) document.documentElement.setAttribute('data-theme', t);
                } catch(e) {}
              })();
            `,
          }}
        />
        <meta name="color-scheme" content="dark light" />
        <meta name="theme-color" content="#080d14" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f5f7fa" media="(prefers-color-scheme: light)" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body>
        <GoogleAnalytics />
        <div className="shell">
          <header className="topbar">
            <Link className="brand" href="/" aria-label="QRZMail Home">
              <span className="mark" aria-hidden="true">Q</span>
              <span>QRZMail</span>
            </Link>
            <nav className="nav" aria-label="Primary">
              <ThemeToggle />
              <NavUser />
            </nav>
          </header>
          <main className="main">{children}</main>

          {/* ── Footer ─────────────────────────────────────── */}
          <footer className="site-footer">
            <div className="footer-inner">
              <p className="footer-copy">
                &copy; {new Date().getFullYear()} QRZMail. All rights reserved.
              </p>
              <div className="footer-links">
                <Link href="/faqs">FAQs</Link>
                <Link href="/privacy">Privacy Policy</Link>
                <Link href="/terms">Terms of Service</Link>
              </div>
            </div>
          </footer>
          <CookieNotice />
        </div>
      </body>
    </html>
  );
}
