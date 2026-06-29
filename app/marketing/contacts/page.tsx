"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Contact {
  id: string;
  email: string;
  name?: string;
  company?: string;
  status: string;
  created_at: string;
}

function ContactsContent() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [listId, setListId] = useState("");
  const [status, setStatus] = useState("");
  const [lists, setLists] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/marketing/lists").then((r) => r.json()).then(setLists).catch(() => {});
  }, []);

  const load = useCallback((p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "50" });
    if (listId) params.set("list_id", listId);
    if (status) params.set("status", status);
    fetch(`/api/marketing/contacts?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setContacts(data.contacts || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [listId, status]);

  useEffect(() => { load(page); }, [page, load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    await fetch(`/api/marketing/contacts/${id}`, { method: "DELETE" });
    load(page);
  };

  return (
    <>
      <div className="panel-header-row" style={{ marginBottom: "28px" }}>
        <div className="panel-header-left">
          <div className="panel-icon" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.05))", border: "1px solid rgba(168,85,247,0.15)", color: "#c084fc" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="panel-header-text">
            <h1>Contacts</h1>
            <p>Manage your contact list — {total} total contacts</p>
          </div>
        </div>
        <div className="panel-header-actions">
          <Link href="/marketing/contacts/find" className="btn btn-secondary">Find Contacts</Link>
        </div>
      </div>

      <div className="filters">
        <select className="filter-select" value={listId} onChange={(e) => { setListId(e.target.value); setPage(1); }}>
          <option value="">All Lists</option>
          {lists.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select className="filter-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Bounced</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : contacts.length === 0 ? (
        <div className="empty-state"><p>No contacts found.</p></div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.email}</td>
                    <td>{c.name || "—"}</td>
                    <td>{c.company || "—"}</td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                    <td style={{ fontSize: "0.8rem", color: "#64748b" }}>{c.created_at}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1rem" }}>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span style={{ padding: "0.35rem 0.5rem", fontSize: "0.85rem", color: "#64748b" }}>Page {page} of {pages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function ContactsPage() {
  return (
    <main className="marketing-content">
      <ContactsContent />
    </main>
  );
}
