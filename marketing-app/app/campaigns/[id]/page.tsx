"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "../../sidebar";

interface CampaignDetail {
  id: string; name: string; status: string;
  provider_id: string; provider_name: string; smtp_host: string;
  template_id: string; template_name: string; template_subject: string;
  list_id: string; list_name: string;
  total_recipients: number; sent_count: number;
  open_count: number; click_count: number;
  bounce_count: number; unsubscribe_count: number; complaint_count: number;
  scheduled_at: string; started_at: string; completed_at: string;
  created_at: string;
}

interface Recipient {
  queue_id: string;
  status: string;
  subject: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  error_message: string | null;
  retry_count: number;
  contact_id: string;
  email: string;
  contact_name: string | null;
  contact_company: string | null;
  links: Array<{ url: string; clicked_at: string | null; click_count: number }>;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/marketing/api/campaigns/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { router.push("/campaigns"); return; }
        setCampaign(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [params.id, router]);

  const loadRecipients = () => {
    setRecipientsLoading(true);
    setShowReport(true);
    fetch(`/marketing/api/campaigns/${params.id}/recipients`)
      .then((r) => r.json())
      .then((data) => {
        setRecipients(data.recipients || []);
      })
      .finally(() => setRecipientsLoading(false));
  };

  const handleAction = async (action: string) => {
    await fetch("/marketing/api/campaigns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: params.id, action }),
    });
    load();
  };

  if (loading) {
    return (
      <div className="marketing-layout">
        <Sidebar />
        <main className="marketing-content">
          <div className="loading-container"><div className="spinner" /><p>Loading campaign...</p></div>
        </main>
      </div>
    );
  }

  if (!campaign) return null;

  const openRate = campaign.sent_count > 0 ? ((campaign.open_count / campaign.sent_count) * 100).toFixed(1) : "0.0";
  const clickRate = campaign.sent_count > 0 ? ((campaign.click_count / campaign.sent_count) * 100).toFixed(1) : "0.0";
  const bounceRate = campaign.sent_count > 0 ? ((campaign.bounce_count / campaign.sent_count) * 100).toFixed(1) : "0.0";

  return (
    <div className="marketing-layout">
      <Sidebar />
      <main className="marketing-content">
        <div className="page">
          <div className="page-header">
            <div>
              <h1>{campaign.name}</h1>
              <p className="subtitle">
                <span className={`badge badge-${campaign.status}`}>{campaign.status}</span>
                {" "}Created {new Date(campaign.created_at).toLocaleDateString()}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {campaign.status === "draft" && (
                <button className="btn btn-primary" onClick={() => handleAction("send")}>Send Now</button>
              )}
              {campaign.status === "sending" && (
                <button className="btn btn-secondary" onClick={() => handleAction("pause")}>Pause</button>
              )}
              {campaign.status === "paused" && (
                <button className="btn btn-primary" onClick={() => handleAction("resume")}>Resume</button>
              )}
              <Link href="/campaigns" className="btn btn-secondary">Back</Link>
            </div>
          </div>

          <div className="campaign-meta">
            <div>
              <span className="meta-label">Provider</span>
              <span className="meta-value">{campaign.provider_name} ({campaign.smtp_host})</span>
            </div>
            <div>
              <span className="meta-label">Template</span>
              <span className="meta-value">{campaign.template_name}</span>
            </div>
            <div>
              <span className="meta-label">Subject</span>
              <span className="meta-value">{campaign.template_subject}</span>
            </div>
            <div>
              <span className="meta-label">List</span>
              <span className="meta-value">{campaign.list_name}</span>
            </div>
            {campaign.scheduled_at && (
              <div>
                <span className="meta-label">Scheduled</span>
                <span className="meta-value">{new Date(campaign.scheduled_at).toLocaleString()}</span>
              </div>
            )}
            {campaign.started_at && (
              <div>
                <span className="meta-label">Started</span>
                <span className="meta-value">{new Date(campaign.started_at).toLocaleString()}</span>
              </div>
            )}
            {campaign.completed_at && (
              <div>
                <span className="meta-label">Completed</span>
                <span className="meta-value">{new Date(campaign.completed_at).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{campaign.sent_count}/{campaign.total_recipients}</div>
              <div className="stat-label">Sent</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{campaign.open_count}</div>
              <div className="stat-label">Opens ({openRate}%)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{campaign.click_count}</div>
              <div className="stat-label">Clicks ({clickRate}%)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{campaign.bounce_count}</div>
              <div className="stat-label">Bounces ({bounceRate}%)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{campaign.unsubscribe_count}</div>
              <div className="stat-label">Unsubscribes</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{campaign.complaint_count}</div>
              <div className="stat-label">Complaints</div>
            </div>
          </div>

          {campaign.status !== "draft" && (
            <div className="section" style={{ marginTop: "2rem" }}>
              <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2>Delivery Report</h2>
                <button className="btn btn-sm btn-secondary" onClick={loadRecipients}>
                  {recipientsLoading ? "Loading..." : showReport ? "Refresh" : "View Details"}
                </button>
              </div>

              {showReport && (
                recipientsLoading ? (
                  <div className="loading-container"><div className="spinner" /><p>Loading recipient data...</p></div>
                ) : recipients.length === 0 ? (
                  <div className="empty-state"><p>No recipient data available yet.</p></div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Name</th>
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
                            <td>{r.contact_name || "-"}</td>
                            <td>
                              <span className={`badge badge-${r.status}`}>{r.status}</span>
                            </td>
                            <td>{r.sent_at ? new Date(r.sent_at).toLocaleString() : "-"}</td>
                            <td>{r.opened_at ? new Date(r.opened_at).toLocaleString() : "-"}</td>
                            <td>{r.clicked_at ? new Date(r.clicked_at).toLocaleString() : "-"}</td>
                            <td>
                              {r.links.length > 0 ? (
                                <details>
                                  <summary style={{ cursor: "pointer", fontSize: "0.85rem" }}>
                                    {r.links.length} link{r.links.length > 1 ? "s" : ""}
                                  </summary>
                                  <ul style={{ margin: "0.25rem 0 0 0", paddingLeft: "1rem", fontSize: "0.8rem" }}>
                                    {r.links.map((link, i) => (
                                      <li key={i}>
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: "break-all" }}>
                                          {link.url.length > 50 ? link.url.substring(0, 50) + "..." : link.url}
                                        </a>
                                        {link.clicked_at && <span style={{ color: "#666", display: "block" }}>Clicked: {new Date(link.clicked_at).toLocaleString()}</span>}
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              ) : (
                                <span style={{ color: "#999", fontSize: "0.85rem" }}>-</span>
                              )}
                            </td>
                            <td>
                              {r.error_message ? (
                                <span style={{ color: "#dc2626", fontSize: "0.8rem" }} title={r.error_message}>
                                  {r.error_message.length > 40 ? r.error_message.substring(0, 40) + "..." : r.error_message}
                                </span>
                              ) : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
