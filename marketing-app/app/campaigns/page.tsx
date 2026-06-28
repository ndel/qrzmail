"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "../sidebar";

interface Campaign {
  id: string; name: string; status: string;
  provider_name: string; template_name: string; list_name: string;
  total_recipients: number; sent_count: number;
  open_count: number; click_count: number;
  bounce_count: number; unsubscribe_count: number;
  created_at: string; scheduled_at: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/marketing/api/campaigns")
      .then((r) => r.json())
      .then(setCampaigns)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAction = async (id: string, action: string) => {
    await fetch("/marketing/api/campaigns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    await fetch(`/marketing/api/campaigns/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="marketing-layout">
      <Sidebar />
      <main className="marketing-content">
        <div className="page">
          <div className="page-header">
            <div>
              <h1>Campaigns</h1>
              <p className="subtitle">Create and manage email campaigns</p>
            </div>
            <Link href="/campaigns/new" className="btn btn-primary">+ New Campaign</Link>
          </div>

          {loading ? (
            <div className="loading-container"><div className="spinner" /><p>Loading campaigns...</p></div>
          ) : campaigns.length === 0 ? (
            <div className="empty-state">
              <p>No campaigns yet. Create your first campaign.</p>
              <Link href="/campaigns/new" className="btn btn-primary">Create Campaign</Link>
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
                    <th>Bounces</th>
                    <th>Unsubs</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td><Link href={`/campaigns/${c.id}`} className="table-link">{c.name}</Link></td>
                      <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                      <td>{c.list_name || "-"}</td>
                      <td>{c.sent_count}/{c.total_recipients}</td>
                      <td>{c.open_count}</td>
                      <td>{c.click_count}</td>
                      <td>{c.bounce_count}</td>
                      <td>{c.unsubscribe_count}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                          {c.status === "draft" && (
                            <button className="btn btn-sm btn-primary" onClick={() => handleAction(c.id, "send")}>Send</button>
                          )}
                          {c.status === "sending" && (
                            <button className="btn btn-sm btn-secondary" onClick={() => handleAction(c.id, "pause")}>Pause</button>
                          )}
                          {c.status === "paused" && (
                            <button className="btn btn-sm btn-primary" onClick={() => handleAction(c.id, "resume")}>Resume</button>
                          )}
                          {(c.status === "draft" || c.status === "completed" || c.status === "failed") && (
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
