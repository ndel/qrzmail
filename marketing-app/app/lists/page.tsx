"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "../sidebar";

interface List {
  id: string; name: string; description: string;
  total_contacts: number; active_contacts: number;
  created_at: string;
}

export default function ListsPage() {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/marketing/api/lists")
      .then((r) => r.json())
      .then(setLists)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this list and all its contacts?")) return;
    await fetch(`/marketing/api/lists/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="marketing-layout">
      <Sidebar />
      <main className="marketing-content">
        <div className="page">
          <div className="page-header">
            <div>
              <h1>Contact Lists</h1>
              <p className="subtitle">Manage your email lists and subscribers</p>
            </div>
            <Link href="/lists/new" className="btn btn-primary">+ New List</Link>
          </div>

          {loading ? (
            <div className="loading-container"><div className="spinner" /><p>Loading lists...</p></div>
          ) : lists.length === 0 ? (
            <div className="empty-state">
              <p>No lists yet. Create your first contact list to get started.</p>
              <Link href="/lists/new" className="btn btn-primary">Create List</Link>
            </div>
          ) : (
            <div className="lists-grid">
              {lists.map((list) => (
                <div key={list.id} className="list-card">
                  <div className="list-info">
                    <h3><Link href={`/lists/${list.id}`} className="table-link">{list.name}</Link></h3>
                    {list.description && <p className="list-desc">{list.description}</p>}
                    <div className="list-stats">
                      <span>Total: <strong>{list.total_contacts}</strong></span>
                      <span className="active">Active: <strong>{list.active_contacts}</strong></span>
                    </div>
                  </div>
                  <div className="list-actions">
                    <Link href={`/lists/${list.id}`} className="btn btn-sm btn-secondary">View</Link>
                    <Link href={`/contacts?list_id=${list.id}`} className="btn btn-sm btn-secondary">Contacts</Link>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(list.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
