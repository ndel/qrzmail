"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Template {
  id: string;
  name: string;
  subject: string;
  created_at: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/marketing/templates")
      .then((r) => r.json())
      .then((data) => { setTemplates(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/marketing/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <main className="marketing-content">
      <div className="panel-header-row" style={{ marginBottom: "28px" }}>
        <div className="panel-header-left">
          <div className="panel-icon" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))", border: "1px solid rgba(34,197,94,0.15)", color: "#4ade80" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="panel-header-text">
            <h1>Email Templates</h1>
            <p>Create and manage reusable email templates for your campaigns</p>
          </div>
        </div>
        <div className="panel-header-actions">
          <Link href="/marketing/templates/new" className="btn btn-primary">+ New Template</Link>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : templates.length === 0 ? (
        <div className="empty-state">
          <p>No templates yet.</p>
          <Link href="/marketing/templates/new" className="btn btn-primary">Create Template</Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Subject</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td><Link href={`/marketing/templates/${t.id}`} style={{ color: "#3b82f6", textDecoration: "none" }}>{t.name}</Link></td>
                  <td style={{ color: "#64748b", fontSize: "0.85rem" }}>{t.subject}</td>
                  <td style={{ fontSize: "0.8rem", color: "#64748b" }}>{t.created_at}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
