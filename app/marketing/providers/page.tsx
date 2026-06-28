"use client";

import { useEffect, useState } from "react";

interface Provider {
  id: string;
  name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  imap_host: string;
  daily_limit: number;
  monthly_limit: number;
  created_at: string;
}

interface VerifyResult {
  success: boolean;
  message?: string;
  error?: string;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [verifyResult, setVerifyResult] = useState<Record<string, VerifyResult>>({});

  // Form state
  const [name, setName] = useState("Default");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [imapUser, setImapUser] = useState("");
  const [imapPass, setImapPass] = useState("");
  const [imapSecure, setImapSecure] = useState(true);

  const load = () => {
    fetch("/api/marketing/providers")
      .then((r) => r.json())
      .then((data) => { setProviders(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/marketing/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, smtp_host: smtpHost, smtp_port: parseInt(smtpPort), smtp_user: smtpUser, smtp_pass: smtpPass, smtp_secure: smtpSecure,
        imap_host: imapHost, imap_port: parseInt(imapPort), imap_user: imapUser, imap_pass: imapPass, imap_secure: imapSecure,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      resetForm();
      load();
    }
  };

  const resetForm = () => {
    setName("Default"); setSmtpHost(""); setSmtpPort("587"); setSmtpUser(""); setSmtpPass(""); setSmtpSecure(true);
    setImapHost(""); setImapPort("993"); setImapUser(""); setImapPass(""); setImapSecure(true);
  };

  const handleVerify = async (id: string) => {
    setVerifyResult((prev) => ({ ...prev, [id]: { success: false, message: "Verifying..." } }));
    const res = await fetch("/api/marketing/providers/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: id }),
    });
    const data = await res.json();
    setVerifyResult((prev) => ({ ...prev, [id]: data }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this provider?")) return;
    await fetch(`/api/marketing/providers/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <main className="marketing-content">
      <div className="page-heading">
        <h1>SMTP Providers</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Provider"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>New SMTP Provider</h3>
          <div className="form-group">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <h4 style={{ margin: "1rem 0 0.5rem", fontSize: "0.9rem", color: "#475569" }}>SMTP Settings</h4>
          <div className="form-row">
            <div className="form-group">
              <label>SMTP Host</label>
              <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} required placeholder="smtp.example.com" />
            </div>
            <div className="form-group">
              <label>SMTP Port</label>
              <input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>SMTP Username</label>
              <input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>SMTP Password</label>
              <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} style={{ width: "auto", marginRight: "0.5rem" }} />
              Use SSL/TLS (secure)
            </label>
          </div>
          <h4 style={{ margin: "1rem 0 0.5rem", fontSize: "0.9rem", color: "#475569" }}>IMAP Settings (for bounce detection)</h4>
          <div className="form-row">
            <div className="form-group">
              <label>IMAP Host</label>
              <input value={imapHost} onChange={(e) => setImapHost(e.target.value)} required placeholder="imap.example.com" />
            </div>
            <div className="form-group">
              <label>IMAP Port</label>
              <input value={imapPort} onChange={(e) => setImapPort(e.target.value)} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>IMAP Username</label>
              <input value={imapUser} onChange={(e) => setImapUser(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>IMAP Password</label>
              <input type="password" value={imapPass} onChange={(e) => setImapPass(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={imapSecure} onChange={(e) => setImapSecure(e.target.checked)} style={{ width: "auto", marginRight: "0.5rem" }} />
              Use SSL/TLS (secure)
            </label>
          </div>
          <button type="submit" className="btn btn-primary">Add Provider</button>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : providers.length === 0 ? (
        <div className="empty-state">
          <p>No SMTP providers configured. Add one to start sending campaigns.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>Add Provider</button>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SMTP Host</th>
                <th>Username</th>
                <th>Limits</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.smtp_host}:{p.smtp_port}</td>
                  <td style={{ fontSize: "0.85rem" }}>{p.smtp_user}</td>
                  <td style={{ fontSize: "0.8rem" }}>{p.daily_limit}/d · {p.monthly_limit}/mo</td>
                  <td>
                    {verifyResult[p.id] ? (
                      <span style={{ color: verifyResult[p.id].success ? "#166534" : "#991b1b", fontSize: "0.8rem" }}>
                        {verifyResult[p.id].success ? "✅ Connected" : `❌ ${verifyResult[p.id].error || "Failed"}`}
                      </span>
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Not tested</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleVerify(p.id)}>Verify</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
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
