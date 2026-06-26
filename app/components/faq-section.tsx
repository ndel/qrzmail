"use client";

import { useState } from "react";

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

export default function FaqSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section className="faq-section">
      <div className="home-section-label">
        <div>
          <span className="eyebrow">✦ Frequently asked questions</span>
          <h1 style={{ marginTop: "10px" }}>FAQs</h1>
          <p>
            Everything you need to know about QRZMail pricing, plans, custom
            domains, and support policies.
          </p>
        </div>
      </div>

      <div className="faq-list">
        {FAQ_ITEMS.map((item, i) => (
          <div key={item.q} className={`faq-item${openFaq === i ? " faq-item-open" : ""}`}>
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
    </section>
  );
}
