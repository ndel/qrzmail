import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your QRZMail webmail inbox. Access your email, calendar, and contacts from any device.",
  robots: { index: false, follow: true },
};

// Login now lives on the homepage — redirect any direct visits here.
export default function LoginPage() {
  redirect("/");
}
