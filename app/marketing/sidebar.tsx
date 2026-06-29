"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
}

const navItems = [
  { href: "/marketing", label: "Dashboard", icon: "📊" },
  { href: "/marketing/campaigns", label: "Campaigns", icon: "📧" },
  { href: "/marketing/lists", label: "Lists", icon: "📋" },
  { href: "/marketing/contacts", label: "Contacts", icon: "👥" },
  { href: "/marketing/contacts/find", label: "Find Contacts", icon: "🔍" },
  { href: "/marketing/templates", label: "Templates", icon: "📝" },
  { href: "/marketing/providers", label: "SMTP Providers", icon: "🔌" },
  { href: "/marketing/segments", label: "Segments", icon: "🎯" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/account/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.email) {
          setUser({
            id: data.user.email,
            email: data.user.email,
            name: data.user.name || "",
          });
        } else {
          router.push("/");
        }
        setChecked(true);
      })
      .catch(() => {
        router.push("/");
        setChecked(true);
      });
  }, [router]);

  return (
    <aside className="panel-sidebar">
      <div className="panel-sidebar-header">
        <Link href="/marketing" className="panel-sidebar-brand">📧 Marketing</Link>
        <Link href="/" className="panel-sidebar-back">← Back to App</Link>
      </div>
      {user && (
        <div className="panel-sidebar-user">
          <span className="panel-sidebar-user-name">{user.name || user.email}</span>
          <span className="panel-sidebar-user-email">{user.email}</span>
        </div>
      )}
      <nav className="panel-sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`panel-sidebar-link ${pathname === item.href ? "active" : ""}`}
          >
            <span className="panel-sidebar-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
