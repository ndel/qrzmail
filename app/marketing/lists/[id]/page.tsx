"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface ListDetail {
  id: string;
  name: string;
  description?: string;
  total_contacts?: number;
  active_contacts?: number;
}

interface Contact {
  id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  status: string;
  created_at: string;
}

export default function ListDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [list, setList] = useState<ListDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Editing list name/description
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // CSV import
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadList = () => {
    fetch(`/api/marketing/lists/${id}`)
      .then((r) => r.json())
      .then((data) => { setList(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const loadContacts = useCallback((p: number) => {
    setContactsLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "50", list_id: id });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/marketing/contacts?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setContacts(data.contacts || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
        setContactsLoading(false);
      })
      .catch(() => setContactsLoading(false));
  }, [id, search, statusFilter]);

  useEffect(() => { loadList(); }, [id]);
  useEffect(() => { loadContacts(page); }, [page, loadContacts]);

  const startEditing = () => {
    if (!list) return;
    setEditName(list.name);
    setEditDesc(list.description || "");
    setEditing(true);
  };

  const saveEdit = async () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    await fetch(`/api/marketing/lists/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, description: editDesc.trim() }),
    });
    setEditing(false);
    loadList();
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const handleImport = async () => {
    const lines = csvText.split("\n").filter((l) => l.trim());
    const contactsData = lines.map((line) => {
      const parts = line.split(",").map((s) => s.trim());
      return { email: parts[0], name: parts[1] || "", company: parts[2] || "" };
    }).filter((c) => c.email);

    if (contactsData.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/marketing/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_id: id, contacts: contactsData }),
      });
      const data = await res.json();
      setImportResult(data);
      setCsvText("");
      loadList();
      loadContacts(1);
      setPage(1);
    } catch (err: any) {
      setImportResult({ error: err.message });
    }
    setImporting(false);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("Delete this contact?")) return;
    await fetch(`/api/marketing/contacts/${contactId}`, { method: "DELETE" });
    loadContacts(page);
    loadList();
  };

  if (loading) return <main className="marketing-content"><p>Loading...</p></main>;
  if (!list) return <main className="marketing-content"><p>List not found</p></main>;

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
            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                  style={{ fontSize: "1.25rem", fontWeight: 600, padding: "0.3rem 0.5rem", border: "1px solid #6366f1", borderRadius: "4px", outline: "none", width: "350px", maxWidth: "100%" }}
                  autoFocus
                />
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                  placeholder="Description (optional)"
                  style={{ fontSize: "0.9rem", padding: "0.25rem 0.5rem", border: "1px solid #cbd5e1", borderRadius: "4px", outline: "none", width: "350px", maxWidth: "100%" }}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h1>{list.name}</h1>
                <p>{list.description || "Mailing list details and contact management"}</p>
              </>
            )}
          </div>
        </div>
        {!editing && (
          <div className="panel-header-actions">
            <button className="btn btn-secondary" onClick={startEditing}>Edit List</button>
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{list.active_contacts || 0}</div>
          <div className="stat-label">Active Contacts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{list.total_contacts || 0}</div>
          <div className="stat-label">Total Contacts</div>
        </div>
      </div>

      {/* Contacts Section */}
      <div className="section">
        <h2 className="section-title">Contacts ({total})</h2>

        <div className="filters" style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="Search by email, name, or company..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="filter-select"
            style={{ flex: 1, minWidth: "200px", padding: "0.4rem 0.6rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem" }}
          />
          <select className="filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="bounced">Bounced</option>
            <option value="complained">Complained</option>
          </select>
        </div>

        {contactsLoading ? (
          <p>Loading contacts...</p>
        ) : contacts.length === 0 ? (
          <div className="card" style={{ padding: "1.5rem", textAlign: "center", color: "#64748b" }}>
            {search || statusFilter ? "No contacts match your filters." : "No contacts in this list yet. Import contacts below."}
          </div>
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
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteContact(c.id)}>Delete</button>
                      </td>
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
      </div>

      {/* Import Section */}
      <div className="section">
        <h2 className="section-title">Import Contacts</h2>
        <div className="card">
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "0.75rem" }}>
            Paste contacts as CSV: <code>email, name, company</code> (one per line)
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`john@example.com, John Doe, Acme Inc\njane@example.com, Jane Smith, Beta Corp`}
            style={{ width: "100%", minHeight: "120px", padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem", fontFamily: "monospace", boxSizing: "border-box" }}
          />
          <button className="btn btn-primary" style={{ marginTop: "0.75rem" }} onClick={handleImport} disabled={!csvText.trim() || importing}>
            {importing ? "Importing..." : "Import Contacts"}
          </button>
          {importResult && (
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: importResult.error ? "#991b1b" : "#166534" }}>
              {importResult.error ? `Error: ${importResult.error}` : `✅ Imported: ${importResult.imported}, Skipped: ${importResult.skipped}`}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
