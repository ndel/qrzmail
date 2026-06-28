"use client";

import { useEffect, useState } from "react";
import Sidebar from "../sidebar";

interface Provider {
  id: string; name: string;
  smtp_host: string; smtp_port: number; smtp_user: string;
  imap_host: string; imap_port: number; imap_user: string;
  daily_limit: number; monthly_limit: number;
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
  const [form, setForm] = useState({
    name: "Default", smtp_host: "", smtp_port: "587", smtp_user: "", smtp_pass: "",
    imap_host: "", imap_port: "993", imap_user: "", imap_pass: "",
    daily_limit: "300", monthly_limit: "9000",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, VerifyResult>>({});

  const load = () => {
    setLoading(true);
    fetch("/api/providers")
      .then((r) => r.json())
      .then(setProviders)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          smtp_port: parseInt(form.smtp_port),
          imap_port: parseInt(form.imap_port),
          daily_limit: parseInt(form.daily_limit),
          monthly_limit: parseInt(form.monthly_limit),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setShowForm(false);
      setForm({ name: "Default", smtp_host: "", smtp_port: "587", smtp_user: "", smtp_pass: "", imap_host: "", imap_port: "993", imap_user: "", imap_pass: "", daily_limit: "300", monthly_limit: "9000" });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      const res = await fetch("/api/providers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider_id: id }),
      });
      const data = await res.json();
      setVerifyResults((prev) => ({ ...prev, [id]: data }));
    } catch (err: any) {
      setVerifyResults((prev) => ({ ...prev, [id]: { success: false, error: err.message } }));
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this provider?")) return;
    await fetch(`/marketing/api/providers/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="marketing-layout">
      <Sidebar />
      <main className="marketing-content">
        <div className="page">
          <div className="page-header">
            <div>
              <h1>SMTP / IMAP Providers</h1>
              <p className="subtitle">Configure your email sending and bounce monitoring settings</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ Add Provider"}
            </button>
          </div>

          {error && <div className="warning" style={{ marginBottom: "1rem" }}>{error}</div>}

          {showForm && (
            <form onSubmit={handleSubmit} className="provider-form">
              <div className="form-section">
                <h3>Provider Details</h3>
                <div className="form-group">
                  <label>Provider Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
              </div>

              <div className="form-section">
                <h3>SMTP Settings (Outgoing)</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>SMTP Host</label>
                    <input type="text" value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} placeholder="smtp.example.com" required />
                  </div>
                  <div className="form-group">
                    <label>SMTP Port</label>
                    <input type="number" value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>SMTP Username</label>
                    <input type="text" value={form.smtp_user} onChange={(e) => setForm({ ...form, smtp_user: e.target.value })} placeholder="user@example.com" required />
                  </div>
                  <div className="form-group">
                    <label>SMTP Password</label>
                    <input type="password" value={form.smtp_pass} onChange={(e) => setForm({ ...form, smtp_pass: e.target.value })} required />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>IMAP Settings (Incoming for Bounce Detection)</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>IMAP Host</label>
                    <input type="text" value={form.imap_host} onChange={(e) => setForm({ ...form, imap_host: e.target.value })} placeholder="imap.example.com" required />
                  </div>
                  <div className="form-group">
                    <label>IMAP Port</label>
                    <input type="number" value={form.imap_port} onChange={(e) => setForm({ ...form, imap_port: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>IMAP Username</label>
                    <input type="text" value={form.imap_user} onChange={(e) => setForm({ ...form, imap_user: e.target.value })} placeholder="user@example.com" required />
                  </div>
                  <div className="form-group">
                    <label>IMAP Password</label>
                    <input type="password" value={form.imap_pass} onChange={(e) => setForm({ ...form, imap_pass: e.target.value })} required />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Rate Limits</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Daily Limit</label>
                    <input type="number" value={form.daily_limit} onChange={(e) => setForm({ ...form, daily_limit: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Monthly Limit</label>
                    <input type="number" value={form.monthly_limit} onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Provider"}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="loading-container"><div className="spinner" /><p>Loading providers...</p></div>
          ) : providers.length === 0 ? (
            <div className="empty-state">
              <p>No providers configured yet. Add your SMTP and IMAP details to get started.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SMTP Host</th>
                    <th>IMAP Host</th>
                    <th>Daily Limit</th>
                    <th>Monthly Limit</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium">{p.name}</td>
                      <td>{p.smtp_host}:{p.smtp_port}</td>
                      <td>{p.imap_host}:{p.imap_port}</td>
                      <td>{p.daily_limit}</td>
                      <td>{p.monthly_limit}</td>
                      <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleVerify(p.id)}
                          disabled={verifyingId === p.id}
                          style={{ marginRight: "0.5rem" }}
                        >
                          {verifyingId === p.id ? "Verifying..." : "Verify"}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}>Delete</button>
                        {verifyResults[p.id] && (
                          <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: verifyResults[p.id].success ? "#16a34a" : "#dc2626" }}>
                            {verifyResults[p.id].success ? "✅ " + verifyResults[p.id].message : "❌ " + verifyResults[p.id].error}
                          </div>
                        )}
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
