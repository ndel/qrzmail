import type { Metadata } from "next";
import PricingSection from "../components/pricing-section";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Compare QRZMail plans for free custom domain email hosting, business mailboxes, aliases, webmail, calendar, contacts, and priority support.",
  alternates: {
    canonical: "https://qrzmail.com/pricing",
  },
  openGraph: {
    title: "QRZMail Pricing",
    description:
      "Simple QRZMail plans for free and business custom domain email hosting with webmail, aliases, calendar, contacts, and DNS authentication.",
    url: "https://qrzmail.com/pricing",
  },
};

export default function PricingPage() {
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
        name: "Pricing",
        item: "https://qrzmail.com/pricing",
      },
    ],
  };

  return (
    <div className="stack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <PricingSection />
    </div>
  );
}
