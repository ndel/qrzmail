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
      <div className="page-heading">
        <h1>Mailing Lists</h1>
        <Link href="/marketing/lists/new" className="btn btn-primary">+ New List</Link>
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
