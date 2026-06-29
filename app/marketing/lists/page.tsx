"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface List {
  id: string;
  name: string;
  description?: string;
  total_contacts?: number;
  active_contacts?: number;
  created_at: string;
}

export default function ListsPage() {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/marketing/lists")
      .then((r) => r.json())
      .then((data) => { setLists(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this list and all its contacts?")) return;
    await fetch(`/api/marketing/lists/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <main className="marketing-content">
      <div className="panel-header-row" style={{ marginBottom: "28px" }}>
        <div className="panel-header-left">
          <div className="panel-icon" style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.05))", border: "1px solid rgba(251,191,36,0.15)", color: "#fbbf24" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className="panel-header-text">
            <h1>Mailing Lists</h1>
            <p>Organize your contacts into targeted mailing lists</p>
          </div>
        </div>
        <div className="panel-header-actions">
          <Link href="/marketing/lists/new" className="btn btn-primary">+ New List</Link>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : lists.length === 0 ? (
        <div className="empty-state">
          <p>No mailing lists yet.</p>
          <Link href="/marketing/lists/new" className="btn btn-primary">Create List</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {lists.map((list) => (
            <div key={list.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <Link href={`/marketing/lists/${list.id}`} style={{ fontWeight: 600, color: "#0f172a", textDecoration: "none", fontSize: "1rem" }}>
                  {list.name}
                </Link>
                {list.description && <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>{list.description}</p>}
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
                  {list.active_contacts || 0} active / {list.total_contacts || 0} total
                </p>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(list.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
