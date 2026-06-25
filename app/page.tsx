import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "QRZMail – Secure Webmail & Custom Domain Email Hosting",
  description:
    "Sign in to your QRZMail inbox, create a free qrzmail.com mailbox, or set up custom domain email hosting with IMAP/SMTP, calendar, contacts, SPF, DKIM & DMARC. Fast, private, and reliable.",
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
      "Sign in to your QRZMail inbox, create a free qrzmail.com mailbox, or set up custom domain email hosting with IMAP/SMTP, calendar, contacts, SPF, DKIM & DMARC.",
  },
};

export default function Home() {
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

        {/* Right — webmail login card */}
        <div>
          <div className="panel home-card">
            <div className="home-card-header">
              <span className="mark lg">Q</span>
              <div>
                <h2>Sign in to webmail</h2>
                <p>Access your inbox on any hosted domain</p>
              </div>
            </div>

            <form
              action="https://mail.qrzmail.com/qrzmail-sso/login"
              method="post"
            >
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@yourdomain.com"
                  required
                />
              </div>

              <div className="field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label htmlFor="password">Password</label>
                  <Link href="/forgot-password" style={{ fontSize: "12px", color: "var(--accent-light)" }}>
                    Forgot?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button className="button primary full" type="submit">
                Open my inbox →
              </button>
            </form>

            <p className="home-card-footer">
              Need a qrzmail.com address?{" "}
              <Link href="/signup" className="text-link">
                Create one free
              </Link>
            </p>
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

      {/* ── Pricing / Plans section ─────────────────────────── */}
      <section>
        <div className="home-section-label">
          <div>
            <span className="eyebrow">✦ Simple, transparent pricing</span>
            <h2 style={{ marginTop: "10px" }}>Plans for every need</h2>
            <p>
              Start with 5 free mailboxes on your own domain. Upgrade when you
              need more storage, more accounts, or priority support.
            </p>
          </div>
        </div>

        <div className="pricing-grid">
          {/* Free Plan */}
          <div className="panel pricing-card pricing-free">
            <div className="pricing-badge">Free</div>
            <div className="pricing-header">
              <strong className="pricing-name">Starter</strong>
              <div className="pricing-amount">
                <span className="pricing-price">$0</span>
                <span className="pricing-period">forever</span>
              </div>
            </div>
            <ul className="pricing-features">
              <li className="pricing-feature">✓ Up to 5 mailboxes</li>
              <li className="pricing-feature">✓ 5 GB storage per mailbox</li>
              <li className="pricing-feature">✓ Unlimited aliases</li>
              <li className="pricing-feature">✓ SPF, DKIM & DMARC</li>
              <li className="pricing-feature">✓ IMAP / SMTP access</li>
              <li className="pricing-feature">✓ Calendar & contacts</li>
              <li className="pricing-feature">✓ Email support</li>
            </ul>
            <Link href="/signup" className="button green full">
              Get started free →
            </Link>
          </div>

          {/* Starter Plan */}
          <div className="panel pricing-card pricing-recommended">
            <div className="pricing-badge pricing-badge-popular">Most Popular</div>
            <div className="pricing-header">
              <strong className="pricing-name">Starter</strong>
              <div className="pricing-amount">
                <span className="pricing-price">$9</span>
                <span className="pricing-period">/month</span>
              </div>
            </div>
            <ul className="pricing-features">
              <li className="pricing-feature">✓ Up to 25 mailboxes</li>
              <li className="pricing-feature">✓ 10 GB storage per mailbox</li>
              <li className="pricing-feature">✓ Unlimited aliases</li>
              <li className="pricing-feature">✓ SPF, DKIM & DMARC</li>
              <li className="pricing-feature">✓ IMAP / SMTP access</li>
              <li className="pricing-feature">✓ Calendar & contacts</li>
              <li className="pricing-feature">✓ Priority email support</li>
            </ul>
            <Link href="/subscribe" className="button primary full">
              Subscribe →
            </Link>
          </div>

          {/* Business Plan */}
          <div className="panel pricing-card">
            <div className="pricing-badge">Business</div>
            <div className="pricing-header">
              <strong className="pricing-name">Business</strong>
              <div className="pricing-amount">
                <span className="pricing-price">$29</span>
                <span className="pricing-period">/month</span>
              </div>
            </div>
            <ul className="pricing-features">
              <li className="pricing-feature">✓ Up to 100 mailboxes</li>
              <li className="pricing-feature">✓ 25 GB storage per mailbox</li>
              <li className="pricing-feature">✓ Unlimited aliases</li>
              <li className="pricing-feature">✓ SPF, DKIM & DMARC</li>
              <li className="pricing-feature">✓ IMAP / SMTP access</li>
              <li className="pricing-feature">✓ Calendar & contacts</li>
              <li className="pricing-feature">✓ Phone & email support</li>
              <li className="pricing-feature">✓ DKIM/DMARC consultation</li>
            </ul>
            <Link href="/subscribe" className="button full">
              Subscribe →
            </Link>
          </div>
        </div>

        <p className="pricing-footnote">
          All plans include encrypted email in transit, spam filtering, and
          access to the QRZMail webmail portal. Need a custom plan?{" "}
          <Link href="mailto:admin@qrzmail.com" className="text-link">
            Contact us
          </Link>.
        </p>
      </section>

    </div>
  );
}
