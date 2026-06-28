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
      <div className="page-heading">
        <h1>Email Templates</h1>
        <Link href="/marketing/templates/new" className="btn btn-primary">+ New Template</Link>
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
