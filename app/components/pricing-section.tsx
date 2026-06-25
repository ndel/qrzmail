"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const PLANS = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    yearly: 0,
    periodLabel: "forever",
    badge: "Free",
    badgeClass: "",
    popular: false,
    description: "Perfect for personal use on your own domain.",
    cta: { href: "/signup", label: "Get started free →", className: "button green full" },
    features: [
      "1 custom domain",
      "Up to 5 mailboxes",
      "2 GB storage per mailbox",
      "Unlimited aliases",
      "IMAP / POP3 / SMTP",
      "Webmail access",
      "Calendar & contacts",
      "SPF, DKIM & DMARC",
      "Community support",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    monthly: 4.99,
    yearly: 3.99,
    periodLabel: "/month",
    badge: "Most Popular",
    badgeClass: "pricing-badge-popular",
    popular: true,
    description: "Ideal for small teams and growing businesses.",
    cta: { href: "/subscribe", label: "Subscribe →", className: "button primary full" },
    features: [
      "Up to 3 custom domains",
      "Up to 10 mailboxes",
      "10 GB storage per mailbox",
      "Unlimited aliases",
      "Catch-all & forwarding",
      "IMAP / POP3 / SMTP",
      "Webmail access",
      "Calendar & contacts",
      "Priority email support",
    ],
  },
  {
    id: "business",
    name: "Business",
    monthly: 12.99,
    yearly: 10.39,
    periodLabel: "/month",
    badge: "Business",
    badgeClass: "",
    popular: false,
    description: "For established teams with advanced needs.",
    cta: { href: "/subscribe", label: "Subscribe →", className: "button full" },
    features: [
      "Up to 10 custom domains",
      "Up to 25 mailboxes",
      "25 GB storage per mailbox",
      "Shared mailboxes",
      "Catch-all & forwarding",
      "IMAP / POP3 / SMTP",
      "Webmail access",
      "Calendar & contacts",
      "Priority support",
      "Migration assistance",
    ],
  },
  {
    id: "business-pro",
    name: "Business Pro",
    monthly: 29.99,
    yearly: 23.99,
    periodLabel: "/month",
    badge: "Pro",
    badgeClass: "",
    popular: false,
    description: "Maximum power for large organizations.",
    cta: { href: "/subscribe", label: "Subscribe →", className: "button full" },
    features: [
      "Unlimited custom domains",
      "Up to 100 mailboxes",
      "50 GB storage per mailbox",
      "Shared mailboxes",
      "Unlimited aliases",
      "Catch-all & forwarding",
      "API access",
      "Webmail access",
      "Migration assistance",
      "Priority support",
    ],
  },
];

const COMPARISON_ROWS = [
  { label: "Custom domains", free: "1", starter: "Up to 3", business: "Up to 10", pro: "Unlimited" },
  { label: "Mailboxes", free: "Up to 5", starter: "Up to 10", business: "Up to 25", pro: "Up to 100" },
  { label: "Storage per mailbox", free: "2 GB", starter: "10 GB", business: "25 GB", pro: "50 GB" },
  { label: "Aliases", free: "Unlimited", starter: "Unlimited", business: "Unlimited", pro: "Unlimited" },
  { label: "Shared mailboxes", free: "—", starter: "—", business: "✓", pro: "✓" },
  { label: "Catch-all", free: "—", starter: "✓", business: "✓", pro: "✓" },
  { label: "Email forwarding", free: "—", starter: "✓", business: "✓", pro: "✓" },
  { label: "API access", free: "—", starter: "—", business: "—", pro: "✓" },
  { label: "IMAP / POP3 / SMTP", free: "✓", starter: "✓", business: "✓", pro: "✓" },
  { label: "Webmail", free: "✓", starter: "✓", business: "✓", pro: "✓" },
  { label: "Calendar & contacts", free: "✓", starter: "✓", business: "✓", pro: "✓" },
  { label: "SPF / DKIM / DMARC", free: "✓", starter: "✓", business: "✓", pro: "✓" },
  { label: "Migration assistance", free: "—", starter: "—", business: "✓", pro: "✓" },
  { label: "Support", free: "Community", starter: "Priority email", business: "Priority", pro: "Priority" },
];

const FAQ_ITEMS = [
  {
    q: "What happens to my data if I downgrade or cancel?",
    a: "You keep full access to your data for the remainder of your billing period. After that, mailboxes are suspended but not immediately deleted — you have 30 days to export your data or resubscribe. Storage limits are enforced at the plan level; if you exceed your new plan's limits, mail delivery continues but you won't be able to send until you free up space or upgrade.",
  },
  {
    q: "Can I add more mailboxes or storage to any plan?",
    a: "Yes. Every plan can be supplemented with additional mailboxes and storage at any time. Additional mailboxes are $1.99/mo each, and extra storage blocks are $0.99/mo per 5 GB. These add-ons are billed pro-rated alongside your base subscription.",
  },
  {
    q: "How do custom domains work?",
    a: "After signing up, you add your domain in the dashboard and update your MX, SPF, DKIM, and DMARC DNS records. QRZMail provides step-by-step instructions for every DNS provider. Once verified, you can start creating mailboxes on your domain immediately. Most domains are fully operational within minutes of DNS propagation.",
  },
  {
    q: "Is there a free trial for paid plans?",
    a: "Starter, Business, and Business Pro plans come with a 14-day free trial — no credit card required. You get full access to all features during the trial. If you don't upgrade by the end of the trial, your account automatically reverts to the Free plan with no data loss.",
  },
  {
    q: "Can I switch between monthly and yearly billing?",
    a: "Absolutely. You can switch from monthly to yearly (or vice versa) at any time from your billing settings. When upgrading to yearly, you're credited for the remaining days on your current monthly period. Yearly billing saves you approximately 20% compared to monthly.",
  },
  {
    q: "What kind of support do you offer?",
    a: "Free plan users get community support via our forums and documentation. Starter and above include priority email support with a guaranteed 4-hour response time during business hours. Business and Business Pro plans also include migration assistance to help you move from your current provider.",
  },
];

export default function PricingSection() {
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [user, setUser] = useState<{ email: string; subscription: string } | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  async function handleSubscribe(planId: string, e: React.MouseEvent) {
    e.preventDefault();

    if (!user) {
      // Not logged in → redirect to login with plan param
      window.location.href = `/domains/login?redirect=/subscribe&plan=${planId}`;
      return;
    }

    if (user.subscription === "paid") {
      window.location.href = "/domains";
      return;
    }

    if (user.subscription === "pending") {
      window.location.href = "/domains";
      return;
    }

    // Logged in and eligible → submit directly
    setSubmitting(planId);

    const csrfToken = sessionStorage.getItem("csrfToken") ?? "";

    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ plan: planId }),
    });

    const result = await response.json();
    setSubmitting(null);

    if (!response.ok) {
      alert(result.error ?? "Subscription request failed.");
      return;
    }

    // Success → redirect to subscribe page to show success state
    window.location.href = `/subscribe?plan=${planId}&success=1`;
  }

  return (
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

      {/* ── Billing toggle ──────────────────────────────── */}
      <div className="billing-toggle-wrap">
        <span className={`billing-toggle-label${!yearly ? " active" : ""}`}>Monthly</span>
        <button
          className={`billing-toggle${yearly ? " yearly" : ""}`}
          onClick={() => setYearly((v) => !v)}
          role="switch"
          aria-checked={yearly}
          aria-label="Toggle yearly billing"
        >
          <span className="billing-toggle-knob" />
        </button>
        <span className={`billing-toggle-label${yearly ? " active" : ""}`}>
          Yearly
          <span className="billing-toggle-save">Save ~20%</span>
        </span>
      </div>

      {/* ── Pricing cards ───────────────────────────────── */}
      <div className="pricing-grid">
        {PLANS.map((plan) => {
          const price = yearly ? plan.yearly : plan.monthly;
          const displayPrice = price === 0 ? "$0" : `$${price.toFixed(2)}`;
          const periodText = price === 0 ? plan.periodLabel : plan.periodLabel;
          const yearlyNote = yearly && price > 0
            ? `billed $${(price * 12).toFixed(2)}/yr`
            : null;

          return (
            <div
              key={plan.id}
              className={`panel pricing-card${plan.popular ? " pricing-recommended" : ""}`}
            >
              {plan.popular && (
                <div className="pricing-badge pricing-badge-popular">{plan.badge}</div>
              )}
              {!plan.popular && (
                <div className="pricing-badge">{plan.badge}</div>
              )}
              <div className="pricing-header">
                <strong className="pricing-name">{plan.name}</strong>
                <p className="pricing-desc">{plan.description}</p>
                <div className="pricing-amount">
                  <span className="pricing-price">{displayPrice}</span>
                  <span className="pricing-period">{periodText}</span>
                </div>
                {yearlyNote && <span className="pricing-yearly-note">{yearlyNote}</span>}
              </div>
              <ul className="pricing-features">
                {plan.features.map((f) => (
                  <li key={f} className="pricing-feature">✓ {f}</li>
                ))}
              </ul>
              {plan.id === "free" ? (
                <Link href={plan.cta.href} className={plan.cta.className}>
                  {plan.cta.label}
                </Link>
              ) : (
                <button
                  className={plan.cta.className}
                  onClick={(e) => handleSubscribe(plan.id, e)}
                  disabled={submitting === plan.id}
                  style={{ cursor: submitting === plan.id ? "wait" : "pointer" }}
                >
                  {submitting === plan.id ? "Submitting..." : plan.cta.label}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="pricing-footnote">
        All plans include encrypted email in transit, spam filtering, and
        access to the QRZMail webmail portal. Need a custom plan?{" "}
        <Link href="mailto:admin@qrzmail.com" className="text-link">
          Contact us
        </Link>.
      </p>

      {/* ── Comparison table ────────────────────────────── */}
      <div className="comparison-section">
        <div className="home-section-label" style={{ marginTop: "80px" }}>
          <div>
            <span className="eyebrow">✦ Compare plans</span>
            <h2 style={{ marginTop: "10px" }}>Everything at a glance</h2>
            <p>
              See exactly what each plan includes so you can choose the right
              fit for your needs.
            </p>
          </div>
        </div>

        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="comparison-th-label">Feature</th>
                <th className="comparison-th">Free</th>
                <th className="comparison-th comparison-th-popular">Starter</th>
                <th className="comparison-th">Business</th>
                <th className="comparison-th">Business Pro</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="comparison-td-label">{row.label}</td>
                  <td className="comparison-td">{row.free}</td>
                  <td className="comparison-td comparison-td-popular">{row.starter}</td>
                  <td className="comparison-td">{row.business}</td>
                  <td className="comparison-td">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── FAQ section ─────────────────────────────────── */}
      <div className="faq-section">
        <div className="home-section-label" style={{ marginTop: "80px" }}>
          <div>
            <span className="eyebrow">✦ Frequently asked questions</span>
            <h2 style={{ marginTop: "10px" }}>Got questions?</h2>
            <p>
              Everything you need to know about QRZMail pricing, plans, and
              policies.
            </p>
          </div>
        </div>

        <div className="faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className={`faq-item${openFaq === i ? " faq-item-open" : ""}`}>
              <button
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
              >
                <span>{item.q}</span>
                <svg
                  className="faq-chevron"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div className="faq-answer" role="region">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
