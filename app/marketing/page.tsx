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
    document.body.classList.add("marketing-route");
    return () => {
      document.body.classList.remove("marketing-route");
    };
  }, []);

  useEffect(() => {
    fetch("/api/marketing/stats")
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <main className="marketing-content"><p>Loading...</p></main>;

  return (
    <main className="marketing-content">
      <div className="page-heading">
        <h1>Marketing Dashboard</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.totalCampaigns || 0}</div>
          <div className="stat-label">Total Campaigns</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalSent || 0}</div>
          <div className="stat-label">Emails Sent</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.activeContacts || 0}</div>
          <div className="stat-label">Active Contacts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalLists || 0}</div>
          <div className="stat-label">Mailing Lists</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalOpens || 0}</div>
          <div className="stat-label">Total Opens</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalClicks || 0}</div>
          <div className="stat-label">Total Clicks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.pendingQueue || 0}</div>
          <div className="stat-label">Pending Queue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalBounces || 0}</div>
          <div className="stat-label">Bounces</div>
        </div>
      </div>

      <div className="quick-actions" style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <Link href="/marketing/campaigns/new" className="action-card">🚀 New Campaign</Link>
        <Link href="/marketing/lists/new" className="action-card">📋 New List</Link>
        <Link href="/marketing/templates/new" className="action-card">📝 New Template</Link>
        <Link href="/marketing/providers" className="action-card">🔌 SMTP Providers</Link>
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
                    <td><Link href={`/marketing/campaigns/${c.id}`} style={{ color: "#3b82f6", textDecoration: "none" }}>{c.name}</Link></td>
                    <td>{c.list_name || "—"}</td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                    <td>{c.sent_count || 0}</td>
                    <td style={{ fontSize: "0.8rem", color: "#64748b" }}>{c.created_at}</td>
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
