"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface CampaignDetail {
  id: string;
  name: string;
  status: string;
  provider_name?: string;
  template_name?: string;
  template_subject?: string;
  list_name?: string;
  total_recipients: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  unsubscribe_count: number;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface Recipient {
  queue_id: string;
  status: string;
  subject: string;
  sent_at?: string;
  opened_at?: string;
  clicked_at?: string;
  error_message?: string;
  retry_count: number;
  contact_id: string;
  email: string;
  contact_name?: string;
  contact_company?: string;
  links: Array<{ url: string; clicked_at?: string; click_count: number }>;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const load = () => {
    fetch(`/api/marketing/campaigns/${id}`)
      .then((r) => r.json())
      .then((data) => { setCampaign(data); setLoading(false); });
  };

  const loadRecipients = () => {
    setRecipientsLoading(true);
    fetch(`/api/marketing/campaigns/${id}/recipients`)
      .then((r) => r.json())
      .then((data) => { setRecipients(data.recipients || []); setRecipientsLoading(false); setShowReport(true); });
  };

  useEffect(load, [id]);

  const handleAction = async (action: string) => {
    await fetch("/api/marketing/campaigns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    load();
  };

  if (loading) return <main className="marketing-content"><p>Loading...</p></main>;
  if (!campaign) return <main className="marketing-content"><p>Campaign not found</p></main>;

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
            <h1>{campaign.name}</h1>
            <p>Campaign details and delivery report</p>
          </div>
        </div>
        <div className="panel-header-actions">
          {campaign.status === "draft" && <button className="btn btn-primary" onClick={() => handleAction("send")}>Send Now</button>}
          {campaign.status === "sending" && <button className="btn btn-secondary" onClick={() => handleAction("pause")}>Pause</button>}
          {campaign.status === "paused" && <button className="btn btn-primary" onClick={() => handleAction("resume")}>Resume</button>}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value"><span className={`badge badge-${campaign.status}`} style={{ fontSize: "1rem" }}>{campaign.status}</span></div>
          <div className="stat-label">Status</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{campaign.sent_count}/{campaign.total_recipients}</div>
          <div className="stat-label">Sent / Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{campaign.open_count || 0}</div>
          <div className="stat-label">Opens</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{campaign.click_count || 0}</div>
          <div className="stat-label">Clicks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{campaign.bounce_count || 0}</div>
          <div className="stat-label">Bounces</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{campaign.unsubscribe_count || 0}</div>
          <div className="stat-label">Unsubscribes</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <table className="data-table">
          <tbody>
            <tr><td style={{ fontWeight: 600, width: "140px" }}>Provider</td><td>{campaign.provider_name || "—"}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Template</td><td>{campaign.template_name || "—"}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Subject</td><td>{campaign.template_subject || "—"}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>List</td><td>{campaign.list_name || "—"}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Scheduled</td><td>{campaign.scheduled_at || "Immediately"}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Started</td><td>{campaign.started_at || "—"}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Completed</td><td>{campaign.completed_at || "—"}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Created</td><td>{campaign.created_at}</td></tr>
          </tbody>
        </table>
      </div>

      {(campaign.status === "sending" || campaign.status === "completed" || campaign.status === "paused" || campaign.status === "failed") && (
        <div className="section">
          <h2 className="section-title">
            Delivery Report
            {!showReport && <button className="btn btn-secondary btn-sm" style={{ marginLeft: "0.75rem" }} onClick={loadRecipients}>Load Report</button>}
          </h2>

          {showReport && (
            recipientsLoading ? (
              <p>Loading recipients...</p>
            ) : recipients.length === 0 ? (
              <p>No recipients found.</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Sent</th>
                      <th>Opened</th>
                      <th>Clicked</th>
                      <th>Links</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((r) => (
                      <tr key={r.queue_id}>
                        <td>{r.email}</td>
                        <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                        <td style={{ fontSize: "0.8rem" }}>{r.sent_at || "—"}</td>
                        <td style={{ fontSize: "0.8rem" }}>{r.opened_at || "—"}</td>
                        <td style={{ fontSize: "0.8rem" }}>{r.clicked_at || "—"}</td>
                        <td>
                          {r.links.length > 0 ? (
                            <details>
                              <summary style={{ cursor: "pointer", fontSize: "0.8rem" }}>{r.links.length} clicked</summary>
                              <ul style={{ fontSize: "0.75rem", paddingLeft: "1rem", margin: "0.25rem 0" }}>
                                {r.links.map((link, i) => (
                                  <li key={i}><a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}>{new URL(link.url).hostname}</a> ({link.click_count}x)</li>
                                ))}
                              </ul>
                            </details>
                          ) : "—"}
                        </td>
                        <td style={{ fontSize: "0.75rem", color: "#ef4444", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>{r.error_message || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}
    </main>
  );
}
