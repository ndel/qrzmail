import type { Metadata } from "next";
import Sidebar from "./sidebar";

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
      <Sidebar />
      <div className="panel-content">{children}</div>
    </div>
  );
}
