import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mail - QRZMail",
  description: "Custom webmail client",
};

export default function MailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
