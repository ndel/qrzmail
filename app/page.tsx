import type { Metadata } from "next";
import Link from "next/link";
import WebmailLoginForm from "@/app/components/webmail-login-form";

export const metadata: Metadata = {
  title: "QRZMail – Secure Webmail & Custom Domain Email Hosting",
  description:
    "Create a free qrzmail.com mailbox, access secure webmail, or set up custom domain email hosting with IMAP/SMTP, calendar, contacts, SPF, DKIM & DMARC. Fast, private, and reliable.",
  keywords: [
    "QRZMail webmail",
    "free email hosting",
    "custom domain email",
    "business email hosting",
    "secure webmail",
    "IMAP SMTP email",
    "DKIM SPF DMARC",
    "qrzmail.com",
    "free domain email",
    "email hosting 5GB",
  ],
  openGraph: {
    title: "QRZMail – Secure Webmail & Custom Domain Email Hosting",
    description:
      "Create a free qrzmail.com mailbox, access secure webmail, or set up custom domain email hosting with IMAP/SMTP, calendar, contacts, SPF, DKIM & DMARC.",
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
            Email that<br />works for you.
          </h1>
          <p className="home-sub">
            Fast, private webmail for qrzmail.com addresses — and a
            complete hosting platform for businesses running email
            on their own domain.
          </p>
          <div className="home-pills">
            <span className="home-pill">📬 Inbox & folders</span>
            <span className="home-pill">📅 Calendar</span>
            <span className="home-pill">👤 Contacts</span>
            <span className="home-pill">🔒 Encrypted in transit</span>
            <span className="home-pill">🌐 Custom domains</span>
          </div>
        </div>

        {/* Right — sign in card */}
        <div>
          <div className="panel home-card">
            <div className="home-card-header">
              <span className="mark lg">Q</span>
              <div>
                <h2>Sign in to your mailbox</h2>
                <p>Access your email, calendar, and contacts</p>
              </div>
            </div>

            <WebmailLoginForm loginFailed={false} />
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
              From personal webmail to full business hosting — QRZMail gives you
              the tools to manage email professionally.
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
