"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
  totalCampaigns: number;
  sentCampaigns: number;
  totalContacts: number;
  activeContacts: number;
  totalSent: number;
  totalOpens: number;
  totalClicks: number;
  totalBounces: number;
  totalUnsubscribes: number;
  pendingQueue: number;
  totalLists: number;
  totalProviders: number;
  recentCampaigns: any[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/marketing/stats")
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <main className="marketing-content"><p>Loading...</p></main>;

  return (
    <main className="marketing-content">
      <div className="panel-header-row" style={{ marginBottom: "28px" }}>
        <div className="panel-header-left">
          <div className="panel-icon" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))", border: "1px solid rgba(99,102,241,0.15)", color: "#818cf8" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="panel-header-text">
            <h1>Marketing Dashboard</h1>
            <p>Manage campaigns, contacts, and email providers</p>
          </div>
        </div>
      </div>

      <div className="panel-stats">
        <div className="panel-stat">
          <div className="panel-stat-icon" style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="panel-stat-info">
            <strong>{stats?.totalCampaigns || 0}</strong>
            <span>Total Campaigns</span>
          </div>
        </div>
        <div className="panel-stat">
          <div className="panel-stat-icon" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </div>
          <div className="panel-stat-info">
            <strong>{stats?.totalSent || 0}</strong>
            <span>Emails Sent</span>
          </div>
        </div>
        <div className="panel-stat">
          <div className="panel-stat-icon" style={{ background: "rgba(168,85,247,0.12)", color: "#c084fc" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="panel-stat-info">
            <strong>{stats?.activeContacts || 0}</strong>
            <span>Active Contacts</span>
          </div>
        </div>
        <div className="panel-stat">
          <div className="panel-stat-icon" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className="panel-stat-info">
            <strong>{stats?.totalLists || 0}</strong>
            <span>Mailing Lists</span>
          </div>
        </div>
        <div className="panel-stat">
          <div className="panel-stat-icon" style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className="panel-stat-info">
            <strong>{stats?.totalOpens || 0}</strong>
            <span>Total Opens</span>
          </div>
        </div>
        <div className="panel-stat">
          <div className="panel-stat-icon" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="panel-stat-info">
            <strong>{stats?.totalClicks || 0}</strong>
            <span>Total Clicks</span>
          </div>
        </div>
        <div className="panel-stat">
          <div className="panel-stat-icon" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="panel-stat-info">
            <strong>{stats?.pendingQueue || 0}</strong>
            <span>Pending Queue</span>
          </div>
        </div>
        <div className="panel-stat">
          <div className="panel-stat-icon" style={{ background: "rgba(248,113,113,0.12)", color: "#f87171" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="panel-stat-info">
            <strong>{stats?.totalBounces || 0}</strong>
            <span>Bounces</span>
          </div>
        </div>
      </div>

      <div className="quick-actions" style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap", marginTop: "8px" }}>
        <Link href="/marketing/campaigns/new" className="action-card" style={{ flex: 1, minWidth: "160px", justifyContent: "center" }}>🚀 New Campaign</Link>
        <Link href="/marketing/lists/new" className="action-card" style={{ flex: 1, minWidth: "160px", justifyContent: "center" }}>📋 New List</Link>
        <Link href="/marketing/templates/new" className="action-card" style={{ flex: 1, minWidth: "160px", justifyContent: "center" }}>📝 New Template</Link>
        <Link href="/marketing/providers" className="action-card" style={{ flex: 1, minWidth: "160px", justifyContent: "center" }}>🔌 SMTP Providers</Link>
      </div>

      {stats?.recentCampaigns && stats.recentCampaigns.length > 0 && (
        <div className="section">
          <h2 className="section-title">Recent Campaigns</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>List</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentCampaigns.map((c: any) => (
                  <tr key={c.id}>
                    <td><Link href={`/marketing/campaigns/${c.id}`} style={{ color: "var(--accent-light)", textDecoration: "none", fontWeight: 500 }}>{c.name}</Link></td>
                    <td>{c.list_name || "—"}</td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                    <td>{c.sent_count || 0}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>{c.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
