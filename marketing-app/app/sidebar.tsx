"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/providers", label: "SMTP/IMAP", icon: "🔧" },
  { href: "/lists", label: "Lists", icon: "👥" },
  { href: "/contacts", label: "Contacts", icon: "📇" },
  { href: "/contacts/find", label: "Find Contacts", icon: "🔍" },
  { href: "/templates", label: "Templates", icon: "✉️" },
  { href: "/campaigns", label: "Campaigns", icon: "📧" },
  { href: "/segments", label: "Segments", icon: "🎯" },
];

interface User {
  id: string;
  email: string;
  name: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <aside className="marketing-sidebar">
      <div className="sidebar-header">
        <Link href="/" className="sidebar-brand">
          <span>📬</span> QRZMail Marketing
        </Link>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? "active" : ""}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <span className="sidebar-user-name">{user.name}</span>
            <span className="sidebar-user-email">{user.email}</span>
          </div>
        )}
        <button className="nav-item sidebar-logout-btn" onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          Sign Out
        </button>
      </div>

      <style>{`
        .sidebar-user {
          padding: 0.5rem 0.75rem;
          margin-bottom: 0.25rem;
          border-bottom: 1px solid var(--line);
        }
        .sidebar-user-name {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--ink);
        }
        .sidebar-user-email {
          display: block;
          font-size: 0.75rem;
          color: var(--ink-soft);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sidebar-logout-btn {
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
        }
        .sidebar-logout-btn:hover {
          background: var(--panel);
          color: var(--red);
        }
      `}</style>
    </aside>
  );
}
