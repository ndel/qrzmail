"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "../sidebar";

interface Template {
  id: string; name: string; subject: string;
  variables: string; created_at: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/templates")
      .then((r) => r.json())
      .then(setTemplates)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await fetch(`/marketing/api/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="marketing-layout">
      <Sidebar />
      <main className="marketing-content">
        <div className="page">
          <div className="page-header">
            <div>
              <h1>Email Templates</h1>
              <p className="subtitle">Create and manage email templates with dynamic variables</p>
            </div>
            <Link href="/templates/new" className="btn btn-primary">+ New Template</Link>
          </div>

          {loading ? (
            <div className="loading-container"><div className="spinner" /><p>Loading templates...</p></div>
          ) : templates.length === 0 ? (
            <div className="empty-state">
              <p>No templates yet. Create your first email template.</p>
              <Link href="/templates/new" className="btn btn-primary">Create Template</Link>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Subject</th>
                    <th>Variables</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => {
                    let vars: string[] = [];
                    try { vars = JSON.parse(t.variables); } catch {}
                    return (
                      <tr key={t.id}>
                        <td className="font-medium">{t.name}</td>
                        <td>{t.subject}</td>
                        <td>{vars.length > 0 ? vars.join(", ") : "None"}</td>
                        <td>{new Date(t.created_at).toLocaleDateString()}</td>
                        <td>
                          <Link href={`/templates/${t.id}`} className="btn btn-sm btn-secondary" style={{ marginRight: "0.5rem" }}>Edit</Link>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
