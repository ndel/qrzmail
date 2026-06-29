import type { Metadata } from "next";
import Sidebar from "./sidebar";
import MarketingBodyClass from "./body-class";

export const metadata: Metadata = {
  title: "Marketing - QRZMail",
  description: "Email marketing campaigns",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="panel-layout">
      <MarketingBodyClass />
      <Sidebar />
      <div className="panel-content">{children}</div>
    </div>
  );
}
