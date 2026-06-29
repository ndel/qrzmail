"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const [user, setUser] = useState<User | null>(null);

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
        }
      })
      .catch(() => {});
  }, []);

  return (
    <aside className="marketing-sidebar">
      <div className="sidebar-header">
        <Link href="/marketing" className="sidebar-brand">📧 Marketing</Link>
        <Link href="/" className="sidebar-back">← Back to App</Link>
      </div>
      {user && (
        <div className="sidebar-user">
          <span className="sidebar-user-name">{user.name || user.email}</span>
          <span className="sidebar-user-email">{user.email}</span>
        </div>
      )}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <style>{`
        .marketing-sidebar {
          width: 240px;
          min-height: 100vh;
          background: #0f172a;
          color: #e2e8f0;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .sidebar-header {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid #1e293b;
        }
        .sidebar-brand {
          font-size: 1.1rem;
          font-weight: 700;
          color: #f8fafc;
          text-decoration: none;
          display: block;
          margin-bottom: 0.25rem;
        }
        .sidebar-back {
          font-size: 0.8rem;
          color: #64748b;
          text-decoration: none;
        }
        .sidebar-back:hover { color: #94a3b8; }
        .sidebar-user {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #1e293b;
          font-size: 0.8rem;
        }
        .sidebar-user-name { display: block; font-weight: 600; color: #f1f5f9; }
        .sidebar-user-email { display: block; color: #64748b; font-size: 0.75rem; }
        .sidebar-nav {
          flex: 1;
          padding: 0.5rem 0;
          overflow-y: auto;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1rem;
          color: #94a3b8;
          text-decoration: none;
          font-size: 0.9rem;
          transition: all 0.15s;
        }
        .sidebar-link:hover { background: #1e293b; color: #e2e8f0; }
        .sidebar-link.active { background: #1e293b; color: #f8fafc; font-weight: 600; border-right: 3px solid #3b82f6; }
        .sidebar-icon { font-size: 1rem; width: 1.25rem; text-align: center; }
        .sidebar-footer {
          padding: 0.75rem 1rem;
          border-top: 1px solid #1e293b;
        }
        .sidebar-logout {
          width: 100%;
          padding: 0.5rem;
          background: transparent;
          border: 1px solid #334155;
          color: #94a3b8;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
        }
        .sidebar-logout:hover { background: #1e293b; color: #f87171; border-color: #f87171; }
      `}</style>
    </aside>
  );
}
