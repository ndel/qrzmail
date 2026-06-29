"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
  complaint_count: number;
  send_rate: number;
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

const RATE_OPTIONS = [
  { value: 0, label: "Unlimited" },
  { value: 1, label: "1 per minute" },
  { value: 5, label: "5 per minute" },
  { value: 10, label: "10 per minute" },
  { value: 25, label: "25 per minute" },
  { value: 50, label: "50 per minute" },
  { value: 100, label: "100 per minute" },
];

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [sendRate, setSendRate] = useState(0);
  const [rateSaving, setRateSaving] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    fetch(`/api/marketing/campaigns/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCampaign(data);
        setSendRate(data.send_rate ?? 0);
        setLoading(false);
      });
  }, [id]);

  const loadRecipients = useCallback(() => {
    setRecipientsLoading(true);
    fetch(`/api/marketing/campaigns/${id}/recipients`)
      .then((r) => r.json())
      .then((data) => {
        setRecipients(data.recipients || []);
        setRecipientsLoading(false);
        setShowReport(true);
      });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh when sending
  useEffect(() => {
    if (autoRefresh && (campaign?.status === "sending" || campaign?.status === "scheduled")) {
      autoRefreshRef.current = setInterval(() => {
        load();
        if (showReport) loadRecipients();
      }, 3000);
    } else {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    }
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [autoRefresh, campaign?.status, load, loadRecipients, showReport]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    await fetch("/api/marketing/campaigns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setActionLoading("");
    load();
    // Auto-enable live refresh when sending
    if (action === "send" || action === "send_now" || action === "resume") {
      setAutoRefresh(true);
    }
  };

  const handleRateChange = async (rate: number) => {
    setRateSaving(true);
    setSendRate(rate);
    await fetch("/api/marketing/campaigns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, send_rate: rate }),
    });
    setRateSaving(false);
  };

  const progressPercent = campaign && campaign.total_recipients > 0
    ? Math.round((campaign.sent_count / campaign.total_recipients) * 100)
    : 0;

  if (loading) return <main className="marketing-content"><p>Loading...</p></main>;
  if (!campaign) return <main className="marketing-content"><p>Campaign not found</p></main>;

  const isActive = campaign.status === "sending" || campaign.status === "scheduled";
  const canSend = campaign.status === "draft" || campaign.status === "scheduled";

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
        <div className="panel-header-actions" style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {canSend && (
            <>
              <button
                className="btn btn-primary"
                onClick={() => handleAction("send_now")}
                disabled={actionLoading === "send_now"}
                title="Send immediately, ignoring schedule"
              >
                {actionLoading === "send_now" ? "Sending..." : "Send Now"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleAction("send")}
                disabled={actionLoading === "send"}
                title="Enqueue and wait for scheduled time"
              >
                {actionLoading === "send" ? "Enqueuing..." : "Schedule Send"}
              </button>
            </>
          )}
          {campaign.status === "sending" && (
            <button
              className="btn btn-secondary"
              onClick={() => handleAction("pause")}
              disabled={actionLoading === "pause"}
            >
              {actionLoading === "pause" ? "Pausing..." : "Pause"}
            </button>
          )}
          {campaign.status === "paused" && (
            <button
              className="btn btn-primary"
              onClick={() => handleAction("resume")}
              disabled={actionLoading === "resume"}
            >
              {actionLoading === "resume" ? "Resuming..." : "Resume"}
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isActive && (
        <div className="card" style={{ marginBottom: "1.5rem", padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>Sending Progress</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Live refresh
              </label>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ flex: 1, height: "24px", background: "#f1f5f9", borderRadius: "12px", overflow: "hidden", position: "relative" }}>
              <div
                style={{
                  height: "100%",
                  width: `${progressPercent}%`,
                  background: campaign.status === "completed"
                    ? "linear-gradient(90deg, #22c55e, #16a34a)"
                    : "linear-gradient(90deg, #6366f1, #818cf8)",
                  borderRadius: "12px",
                  transition: "width 0.5s ease-in-out",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: progressPercent > 5 ? "fit-content" : undefined,
                }}
              >
                {progressPercent > 10 && (
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#fff", padding: "0 0.5rem" }}>
                    {progressPercent}%
                  </span>
                )}
              </div>
            </div>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
              {campaign.sent_count} / {campaign.total_recipients}
            </span>
          </div>
          {campaign.status === "sending" && (
            <p style={{ fontSize: "0.8rem", color: "#6366f1", margin: "0.5rem 0 0 0" }}>
              {campaign.total_recipients - campaign.sent_count} remaining
            </p>
          )}
          {campaign.status === "completed" && (
            <p style={{ fontSize: "0.8rem", color: "#16a34a", margin: "0.5rem 0 0 0" }}>
              {'\u2705'} All emails sent successfully
            </p>
          )}
        </div>
      )}

      {/* Stats Grid */}
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

      {/* Campaign Details */}
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
            <tr>
              <td style={{ fontWeight: 600 }}>Send Rate</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <select
                    value={sendRate}
                    onChange={(e) => handleRateChange(parseInt(e.target.value))}
                    disabled={rateSaving || campaign.status === "completed"}
                    style={{ padding: "0.3rem 0.5rem", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "0.85rem" }}
                  >
                    {RATE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {rateSaving && <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Saving...</span>}
                  {!rateSaving && sendRate > 0 && (
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      (max {sendRate} email{sendRate !== 1 ? "s" : ""} per minute)
                    </span>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Delivery Report */}
      {(campaign.status === "sending" || campaign.status === "completed" || campaign.status === "paused" || campaign.status === "failed") && (
        <div className="section">
          <h2 className="section-title">
            Delivery Report
            {!showReport && <button className="btn btn-secondary btn-sm" style={{ marginLeft: "0.75rem" }} onClick={loadRecipients}>Load Report</button>}
            {showReport && isActive && (
              <button className="btn btn-secondary btn-sm" style={{ marginLeft: "0.75rem" }} onClick={loadRecipients}>
                Refresh
              </button>
            )}
          </h2>

          {showReport && (
            recipientsLoading ? (
              <p>Loading recipients...</p>
            ) : recipients.length === 0 ? (
              <p>No recipients found.</p>
            ) : (
              <>
                {/* Summary stats */}
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                  {(() => {
                    const sent = recipients.filter((r) => r.status === "sent").length;
                    const pending = recipients.filter((r) => r.status === "pending" || r.status === "sending").length;
                    const failed = recipients.filter((r) => r.status === "failed").length;
                    const opened = recipients.filter((r) => r.opened_at).length;
                    const clicked = recipients.filter((r) => r.clicked_at).length;
                    return (
                      <>
                        <div className="stat-card" style={{ padding: "0.5rem 1rem", minWidth: "80px" }}>
                          <div className="stat-value" style={{ fontSize: "1rem" }}>{sent}</div>
                          <div className="stat-label" style={{ fontSize: "0.7rem" }}>Sent</div>
                        </div>
                        <div className="stat-card" style={{ padding: "0.5rem 1rem", minWidth: "80px" }}>
                          <div className="stat-value" style={{ fontSize: "1rem", color: "#6366f1" }}>{pending}</div>
                          <div className="stat-label" style={{ fontSize: "0.7rem" }}>Pending</div>
                        </div>
                        <div className="stat-card" style={{ padding: "0.5rem 1rem", minWidth: "80px" }}>
                          <div className="stat-value" style={{ fontSize: "1rem", color: "#ef4444" }}>{failed}</div>
                          <div className="stat-label" style={{ fontSize: "0.7rem" }}>Failed</div>
                        </div>
                        <div className="stat-card" style={{ padding: "0.5rem 1rem", minWidth: "80px" }}>
                          <div className="stat-value" style={{ fontSize: "1rem", color: "#22c55e" }}>{opened}</div>
                          <div className="stat-label" style={{ fontSize: "0.7rem" }}>Opened</div>
                        </div>
                        <div className="stat-card" style={{ padding: "0.5rem 1rem", minWidth: "80px" }}>
                          <div className="stat-value" style={{ fontSize: "1rem", color: "#f59e0b" }}>{clicked}</div>
                          <div className="stat-label" style={{ fontSize: "0.7rem" }}>Clicked</div>
                        </div>
                      </>
                    );
                  })()}
                </div>

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
              </>
            )
          )}
        </div>
      )}
    </main>
  );
}
