"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Campaign {
  id: string;
  name: string;
  status: string;
  sent_count: number;
  total_recipients: number;
  open_count: number;
  click_count: number;
  created_at: string;
  provider_name?: string;
  template_name?: string;
  list_name?: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/marketing/campaigns")
      .then((r) => r.json())
      .then((data) => { setCampaigns(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAction = async (id: string, action: string) => {
    await fetch("/api/marketing/campaigns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    await fetch(`/api/marketing/campaigns/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <main className="marketing-content">
      <div className="panel-header-row" style={{ marginBottom: "28px" }}>
        <div className="panel-header-left">
          <div className="panel-icon" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))", border: "1px solid rgba(99,102,241,0.15)", color: "#818cf8" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
            </svg>
          </div>
          <div className="panel-header-text">
            <h1>Campaigns</h1>
            <p>Create and manage email marketing campaigns</p>
          </div>
        </div>
        <div className="panel-header-actions">
          <Link href="/marketing/campaigns/new" className="btn btn-primary">+ New Campaign</Link>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : campaigns.length === 0 ? (
        <div className="empty-state">
          <p>No campaigns yet. Create your first campaign to get started!</p>
          <Link href="/marketing/campaigns/new" className="btn btn-primary">Create Campaign</Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>List</th>
                <th>Sent</th>
                <th>Opens</th>
                <th>Clicks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/marketing/campaigns/${c.id}`} style={{ color: "#3b82f6", textDecoration: "none" }}>{c.name}</Link></td>
                  <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                  <td>{c.list_name || "—"}</td>
                  <td>{c.sent_count}/{c.total_recipients}</td>
                  <td>{c.open_count || 0}</td>
                  <td>{c.click_count || 0}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      {(c.status === "draft" || c.status === "scheduled") && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => handleAction(c.id, "send_now")}>Send Now</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleAction(c.id, "send")}>Schedule</button>
                        </>
                      )}
                      {c.status === "sending" && <button className="btn btn-secondary btn-sm" onClick={() => handleAction(c.id, "pause")}>Pause</button>}
                      {c.status === "paused" && <button className="btn btn-primary btn-sm" onClick={() => handleAction(c.id, "resume")}>Resume</button>}
                      {(c.status === "draft" || c.status === "completed" || c.status === "failed") && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
