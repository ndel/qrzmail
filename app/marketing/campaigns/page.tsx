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
      <div className="page-heading">
        <h1>Campaigns</h1>
        <Link href="/marketing/campaigns/new" className="btn btn-primary">+ New Campaign</Link>
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
                      {c.status === "draft" && <button className="btn btn-primary btn-sm" onClick={() => handleAction(c.id, "send")}>Send</button>}
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
