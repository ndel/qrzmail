"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = { email: string; name: string; role?: string; subscription?: string } | null;

export default function NavUser() {
  const router = useRouter();
  const [user, setUser] = useState<User>(undefined as unknown as User);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        setUser(data.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  async function handleLogout() {
    await fetch("/api/account/logout", { method: "POST" });
    setUser(null);
    router.push("/domains/login");
  }

  if (loading) {
    return <span className="nav-placeholder" />;
  }

  if (user) {
    return (
      <>
        <Link href="/pricing">Pricing</Link>
        <Link href="/domains">Domain panel</Link>
        <Link href="/marketing">Marketing</Link>
        {user.subscription === "free" && (
          <Link href="/subscribe" className="cta" style={{ fontSize: "13px", padding: "6px 14px" }}>
            Upgrade
          </Link>
        )}
        <button className="cta logout-cta" onClick={handleLogout} title="Logout">
          <span className="nav-user-email">{user.email}</span>
          <span className="nav-logout-label">Logout</span>
        </button>
      </>
    );
  }

  return (
    <>
      <Link href="/pricing">Pricing</Link>
      <Link href="/domains/login">Domain panel</Link>
      <Link href="/marketing">Marketing</Link>
      <Link href="/signup" className="cta">
        Sign up free
      </Link>
    </>
  );
}
