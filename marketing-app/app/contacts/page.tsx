"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "../sidebar";

interface Contact {
  id: string; list_id: string; email: string; name: string;
  company: string; phone: string; status: string;
  created_at: string;
}

interface List {
  id: string; name: string;
}

function ContactsContent() {
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [listId, setListId] = useState(searchParams.get("list_id") || "");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback((p: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (listId) params.set("list_id", listId);
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    params.set("page", String(p));
    params.set("limit", "50");

    fetch(`/marketing/api/contacts?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setContacts(data.contacts);
        setTotal(data.total);
        setPages(data.pages);
        setPage(data.page);
      })
      .finally(() => setLoading(false));
  }, [listId, status, search]);

  useEffect(() => {
    fetch("/api/lists").then((r) => r.json()).then(setLists);
  }, []);

  useEffect(() => { load(1); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    await fetch(`/marketing/api/contacts/${id}`, { method: "DELETE" });
    load(page);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Contacts</h1>
          <p className="subtitle">Manage your email contacts ({total} total)</p>
        </div>
      </div>

      <div className="filters">
        <select className="filter-select" value={listId} onChange={(e) => setListId(e.target.value)}>
          <option value="">All Lists</option>
          {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Bounced</option>
          <option value="complained">Complained</option>
        </select>
        <div className="search-form">
          <input className="search-input" placeholder="Search email, name, company..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /><p>Loading contacts...</p></div>
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
                  <th>List</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.email}</td>
                    <td>{c.name || "-"}</td>
                    <td>{c.company || "-"}</td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                    <td>{lists.find((l) => l.id === c.list_id)?.name || c.list_id.slice(0, 8)}</td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="pagination">
              <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
              <span className="page-info">Page {page} of {pages}</span>
              <button className="btn btn-sm btn-secondary" disabled={page >= pages} onClick={() => load(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ContactsPage() {
  return (
    <div className="marketing-layout">
      <Sidebar />
      <main className="marketing-content">
        <Suspense fallback={
          <div className="page">
            <div className="loading-container"><div className="spinner" /><p>Loading contacts...</p></div>
          </div>
        }>
          <ContactsContent />
        </Suspense>
      </main>
    </div>
  );
}
