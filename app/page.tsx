import type { Metadata } from "next";
import Link from "next/link";
import HomeSignupForm from "@/app/components/home-signup-form";

export const metadata: Metadata = {
  title: "QRZMail – Secure Webmail, Email Hosting & Email Marketing",
  description:
    "Create a free qrzmail.com mailbox, access secure webmail, set up custom domain email hosting, or launch email marketing campaigns — all from one platform. IMAP/SMTP, calendar, contacts, SPF, DKIM & DMARC included.",
  keywords: [
    "QRZMail webmail",
    "free email hosting",
    "custom domain email",
    "business email hosting",
    "secure webmail",
    "email marketing platform",
    "email campaigns",
    "IMAP SMTP email",
    "DKIM SPF DMARC",
    "qrzmail.com",
    "free domain email",
    "email hosting 5GB",
    "bulk email marketing",
    "newsletter tool",
  ],
  openGraph: {
    title: "QRZMail – Secure Webmail, Email Hosting & Email Marketing",
    description:
      "Create a free qrzmail.com mailbox, access secure webmail, set up custom domain email hosting, or launch email marketing campaigns — all from one platform.",
  },
};

export default async function Home() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://qrzmail.com",
      },
    ],
  };

  return (
    <div className="stack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="home-hero">

        {/* Left copy */}
        <div className="home-copy">
          <span className="eyebrow">✦ QRZMail</span>
          <h1 className="home-headline">
            Email, hosting &<br />marketing — unified.
          </h1>
          <p className="home-sub">
            Secure webmail, custom domain email hosting, and
            powerful email marketing campaigns — all from one
            platform. Send newsletters, automate follow-ups, and
            grow your audience alongside your inbox.
          </p>
          <div className="home-pills">
            <span className="home-pill">📬 Inbox & folders</span>
            <span className="home-pill">📅 Calendar</span>
            <span className="home-pill">👤 Contacts</span>
            <span className="home-pill">📧 Email campaigns</span>
            <span className="home-pill">🌐 Custom domains</span>
            <span className="home-pill">🔒 Encrypted in transit</span>
          </div>
        </div>

        {/* Right — create account card */}
        <div>
          <div className="panel home-card">
            <div className="home-card-header">
              <span className="mark lg">Q</span>
              <div>
                <h2>Create your free mailbox</h2>
                <p>Get a @qrzmail.com address in seconds</p>
              </div>
            </div>

            <HomeSignupForm />
          </div>
        </div>
      </section>

      {/* ── Portal Features section ─────────────────────────── */}
      <section>
        <div className="home-section-label">
          <div>
            <span className="eyebrow">✦ Everything you need</span>
            <h2 style={{ marginTop: "10px" }}>A complete email platform</h2>
            <p>
              From personal webmail and business hosting to email marketing
              campaigns — QRZMail gives you the tools to manage all your
              email in one place.
            </p>
          </div>
        </div>

        <div className="portal-grid">
          <div className="panel portal-card">
            <div className="portal-icon">📬</div>
            <h3>Webmail Access</h3>
            <p>
              Full-featured webmail with inbox management, folders, search,
              and conversation threading via SOGo.
            </p>
          </div>
          <div className="panel portal-card">
            <div className="portal-icon">📅</div>
            <h3>Calendar & Contacts</h3>
            <p>
              Built-in calendar with event scheduling, reminders, and shared
              address books — all synced across devices.
            </p>
          </div>
          <div className="panel portal-card">
            <div className="portal-icon">🌐</div>
            <h3>Custom Domain Email</h3>
            <p>
              Host email on your own domain with unlimited aliases, catch-all
              addresses, and full DNS management.
            </p>
          </div>
          <div className="panel portal-card">
            <div className="portal-icon">📧</div>
            <h3>Email Marketing</h3>
            <p>
              Create, send, and track email campaigns with drag-and-drop
              templates, contact lists, segments, and real-time analytics.
            </p>
          </div>
          <div className="panel portal-card">
            <div className="portal-icon">🔒</div>
            <h3>Email Authentication</h3>
            <p>
              Protect your domain with SPF, DKIM, and DMARC. Improve
              deliverability and prevent spoofing.
            </p>
          </div>
          <div className="panel portal-card">
            <div className="portal-icon">📡</div>
            <h3>IMAP / SMTP</h3>
            <p>
              Connect any email client — Outlook, Thunderbird, Apple Mail —
              with standard IMAP and SMTP over TLS.
            </p>
          </div>
          <div className="panel portal-card">
            <div className="portal-icon">⚙️</div>
            <h3>Domain Dashboard</h3>
            <p>
              Manage domains, mailboxes, aliases, and DNS records from a
              single, intuitive control panel.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
