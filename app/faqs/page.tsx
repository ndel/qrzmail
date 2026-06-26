import type { Metadata } from "next";
import FaqSection from "../components/faq-section";

export const metadata: Metadata = {
  title: "FAQs",
  description:
    "Answers to common QRZMail questions about pricing, custom domain email hosting, mailboxes, storage, billing, and support.",
  alternates: {
    canonical: "https://qrzmail.com/faqs",
  },
  openGraph: {
    title: "QRZMail FAQs",
    description:
      "Find answers about QRZMail pricing, custom domains, mailboxes, storage, billing, and support.",
    url: "https://qrzmail.com/faqs",
  },
};

export default function FaqsPage() {
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
      {
        "@type": "ListItem",
        position: 2,
        name: "FAQs",
        item: "https://qrzmail.com/faqs",
      },
    ],
  };

  return (
    <div className="stack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <FaqSection />
    </div>
  );
}
