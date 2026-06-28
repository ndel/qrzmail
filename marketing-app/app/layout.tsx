import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QRZMail Marketing",
  description: "Email Marketing Platform - Send campaigns, track results, manage contacts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
