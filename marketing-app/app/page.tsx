"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "./sidebar";

interface Stats {
  totalCampaigns: number; sentCampaigns: number;
  totalContacts: number; activeContacts: number;
  totalSent: number; totalOpens: number; totalClicks: number;
  totalBounces: number; totalUnsubscribes: number;
  pendingQueue: number; totalLists: number; totalProviders: number;
  recentCampaigns: any[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="marketing-layout">
        <Sidebar />
        <main className="marketing-content">
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="marketing-layout">
      <Sidebar />
      <main className="marketing-content">
        <div className="page">
          <div className="page-header">
            <div>
              <h1>Dashboard</h1>
              <p className="subtitle">Overview of your email marketing performance</p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats?.totalCampaigns || 0}</div>
              <div className="stat-label">Campaigns</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats?.totalSent || 0}</div>
              <div className="stat-label">Emails Sent</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats?.totalOpens || 0}</div>
              <div className="stat-label">Opens</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats?.totalClicks || 0}</div>
              <div className="stat-label">Clicks</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats?.activeContacts || 0}</div>
              <div className="stat-label">Active Contacts</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats?.pendingQueue || 0}</div>
              <div className="stat-label">Pending Queue</div>
            </div>
          </div>

          <div className="section">
            <h2>Quick Actions</h2>
            <div className="quick-actions">
              <Link href="/campaigns/new" className="action-card">
                <div className="action-icon">📧</div>
                <div className="action-title">New Campaign</div>
                <div className="action-desc">Create and send a new email campaign</div>
              </Link>
              <Link href="/lists/new" className="action-card">
                <div className="action-icon">👥</div>
                <div className="action-title">New List</div>
                <div className="action-desc">Create a contact list or import contacts</div>
              </Link>
              <Link href="/templates/new" className="action-card">
                <div className="action-icon">✉️</div>
                <div className="action-title">New Template</div>
                <div className="action-desc">Design an email template with variables</div>
              </Link>
              <Link href="/providers" className="action-card">
                <div className="action-icon">🔧</div>
                <div className="action-title">SMTP/IMAP Settings</div>
                <div className="action-desc">Configure your email sending provider</div>
              </Link>
            </div>
          </div>

          <div className="section">
            <h2>Recent Campaigns</h2>
            {stats?.recentCampaigns && stats.recentCampaigns.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>List</th>
                      <th>Status</th>
                      <th>Sent</th>
                      <th>Opens</th>
                      <th>Clicks</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentCampaigns.map((c: any) => (
                      <tr key={c.id}>
                        <td><Link href={`/campaigns/${c.id}`} className="table-link">{c.name}</Link></td>
                        <td>{c.list_name || "-"}</td>
                        <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                        <td>{c.sent_count}</td>
                        <td>{c.open_count}</td>
                        <td>{c.click_count}</td>
                        <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>No campaigns yet. Create your first campaign to get started!</p>
                <Link href="/campaigns/new" className="btn btn-primary">Create Campaign</Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
