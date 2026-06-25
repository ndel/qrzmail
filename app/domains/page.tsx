import type { Metadata } from "next";
import DomainsClient from "./domains-client";

export const metadata: Metadata = {
  title: "Domain Management",
  description:
    "Manage your custom email domains, create mailboxes, configure DNS records (MX, SPF, DKIM, DMARC), and set up email aliases.",
  robots: { index: false, follow: false },
};

export default function DomainsPage() {
  return <DomainsClient />;
}
