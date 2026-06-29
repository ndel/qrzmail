"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
  custom_fields?: string;
  status: string;
  created_at: string;
}

interface CsvRow {
  [key: string]: string;
}

interface ColumnMapping {
  [csvColumn: string]: "email" | "name" | "company" | "phone" | "skip";
}

const CONTACT_FIELDS: { value: string; label: string }[] = [
  { value: "email", label: "Email (required)" },
  { value: "name", label: "Name" },
  { value: "company", label: "Company" },
  { value: "phone", label: "Phone" },
  { value: "skip", label: "\u2014 Skip column" },
];

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });

  return { headers, rows };
}

function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const lowerHeaders = headers.map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));

  const fieldPatterns: Record<string, RegExp[]> = {
    email: [/^email/, /^e-?mail/, /^mail/],
    name: [/^name/, /^full.?name/, /^contact.?name/, /^first.?name/, /^last.?name/, /^customer.?name/],
    company: [/^company/, /^organization/, /^org/, /^business/, /^firm/, /^employer/],
    phone: [/^phone/, /^mobile/, /^telephone/, /^tel/, /^cell/, /^contact.?number/, /^phone.?number/],
  };

  const assigned = new Set<string>();

  for (const [field, patterns] of Object.entries(fieldPatterns)) {
    for (let i = 0; i < headers.length; i++) {
      if (assigned.has(headers[i])) continue;
      if (patterns.some((p) => p.test(lowerHeaders[i]))) {
        mapping[headers[i]] = field as any;
        assigned.add(headers[i]);
        break;
      }
    }
  }

  for (const h of headers) {
    if (!mapping[h]) {
      mapping[h] = "skip";
    }
  }

  const hasEmail = Object.values(mapping).includes("email");
  if (!hasEmail && headers.length > 0) {
    mapping[headers[0]] = "email";
  }

  return mapping;
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

  // CSV import with mapping
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<CsvRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [csvFileName, setCsvFileName] = useState("");

  // Add single contact form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addCompany, setAddCompany] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addingContact, setAddingContact] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

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

  // CSV file handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const { headers, rows } = parseCsv(text);
      setCsvHeaders(headers);
      setCsvPreview(rows.slice(0, 5));
      const detected = autoDetectMapping(headers);
      setColumnMapping(detected);
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (csvColumn: string, value: string) => {
    const newMapping = { ...columnMapping };
    for (const [col, mapped] of Object.entries(newMapping)) {
      if (mapped === value && value !== "skip" && col !== csvColumn) {
        newMapping[col] = "skip";
      }
    }
    newMapping[csvColumn] = value as any;
    setColumnMapping(newMapping);
  };

  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const text = await file.text();
    const { headers, rows } = parseCsv(text);

    const contactsData = rows.map((row) => {
      const contact: Record<string, string> = {};
      for (const header of headers) {
        const field = columnMapping[header];
        if (field && field !== "skip") {
          contact[field] = row[header] || "";
        }
      }
      return contact;
    }).filter((c) => c.email && c.email.trim());

    if (contactsData.length === 0) {
      setImportResult({ error: "No rows with valid email addresses found." });
      return;
    }

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
      if (fileInputRef.current) fileInputRef.current.value = "";
      setCsvFileName("");
      setCsvHeaders([]);
      setCsvPreview([]);
      setColumnMapping({});
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

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = addEmail.trim();
    if (!email) { setAddError("Email is required"); return; }
    setAddingContact(true);
    setAddError("");
    setAddSuccess("");
    try {
      const res = await fetch("/api/marketing/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          list_id: id,
          email,
          name: addName.trim() || undefined,
          company: addCompany.trim() || undefined,
          phone: addPhone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to add contact");
      } else {
        setAddSuccess(`Contact "${email}" added successfully!`);
        setAddEmail("");
        setAddName("");
        setAddCompany("");
        setAddPhone("");
        setShowAddForm(false);
        loadList();
        loadContacts(1);
        setPage(1);
      }
    } catch (err: any) {
      setAddError(err.message || "Failed to add contact");
    }
    setAddingContact(false);
  };

  const hasEmailMapped = Object.values(columnMapping).includes("email");

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 className="section-title" style={{ margin: 0 }}>Contacts ({total})</h2>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowAddForm(!showAddForm); setAddError(""); setAddSuccess(""); }}>
            {showAddForm ? "Cancel" : "+ Add Contact"}
          </button>
        </div>

        {/* Add Single Contact Form */}
        {showAddForm && (
          <div className="card" style={{ marginBottom: "1.25rem", padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: "0 0 0.75rem 0" }}>Add Contact Manually</h3>
            <form onSubmit={handleAddContact} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <div className="form-group" style={{ flex: "1 1 200px", margin: 0 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>
                    Email <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="contact@example.com"
                    required
                    style={{ width: "100%", padding: "0.45rem 0.6rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem", boxSizing: "border-box" }}
                  />
                </div>
                <div className="form-group" style={{ flex: "1 1 200px", margin: 0 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Name</label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="John Doe"
                    style={{ width: "100%", padding: "0.45rem 0.6rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem", boxSizing: "border-box" }}
                  />
                </div>
                <div className="form-group" style={{ flex: "1 1 200px", margin: 0 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Company</label>
                  <input
                    type="text"
                    value={addCompany}
                    onChange={(e) => setAddCompany(e.target.value)}
                    placeholder="Acme Inc."
                    style={{ width: "100%", padding: "0.45rem 0.6rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem", boxSizing: "border-box" }}
                  />
                </div>
                <div className="form-group" style={{ flex: "1 1 200px", margin: 0 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Phone</label>
                  <input
                    type="text"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder="+1 555-123-4567"
                    style={{ width: "100%", padding: "0.45rem 0.6rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem", boxSizing: "border-box" }}
                  />
                </div>
              </div>
              {addError && (
                <div style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", fontSize: "0.85rem", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>
                  {addError}
                </div>
              )}
              {addSuccess && (
                <div style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", fontSize: "0.85rem", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
                  {addSuccess}
                </div>
              )}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" className="btn btn-primary" disabled={addingContact}>
                  {addingContact ? "Adding..." : "Add Contact"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddForm(false); setAddError(""); setAddSuccess(""); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

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
                    <th>Phone</th>
                    <th>Website</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => {
                    let website = "";
                    try {
                      const cf = JSON.parse(c.custom_fields || "{}");
                      website = cf.website || "";
                    } catch {}
                    return (
                      <tr key={c.id}>
                        <td>{c.email}</td>
                        <td>{c.name || "\u2014"}</td>
                        <td>{c.company || "\u2014"}</td>
                        <td style={{ fontSize: "0.8rem", color: "#64748b" }}>{c.phone || "\u2014"}</td>
                        <td style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          {website ? (
                            <a href={`https://${website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "none" }}>
                              {website}
                            </a>
                          ) : "\u2014"}
                        </td>
                        <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                        <td style={{ fontSize: "0.8rem", color: "#64748b" }}>{c.created_at}</td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteContact(c.id)}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1rem" }}>
                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{'\u2190'} Prev</button>
                <span style={{ padding: "0.35rem 0.5rem", fontSize: "0.85rem", color: "#64748b" }}>Page {page} of {pages}</span>
                <button className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next {'\u2192'}</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Import Section */}
      <div className="section">
        <h2 className="section-title">Import Contacts from CSV</h2>
        <div className="card">
          {/* Step 1: Upload */}
          <div style={{ marginBottom: csvHeaders.length > 0 ? "1.25rem" : 0 }}>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "0.75rem" }}>
              Upload a CSV file with your contacts. You'll be able to map columns to contact fields.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileSelect}
                style={{ fontSize: "0.85rem" }}
              />
              {csvFileName && (
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  Selected: {csvFileName}
                </span>
              )}
            </div>
          </div>

          {/* Step 2: Column Mapping */}
          {csvHeaders.length > 0 && (
            <>
              <div style={{ marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: "0 0 0.5rem 0" }}>Column Mapping</h3>
                <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.75rem" }}>
                  Map each CSV column to a contact field. At least one column must be mapped to <strong>Email</strong>.
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "0.4rem 0.6rem", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>CSV Column</th>
                        <th style={{ textAlign: "left", padding: "0.4rem 0.6rem", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>Map to Field</th>
                        {csvPreview.length > 0 && csvPreview[0] && csvHeaders.slice(0, 3).map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "0.4rem 0.6rem", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontWeight: 600, fontSize: "0.8rem", whiteSpace: "nowrap" }}>Sample: {h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvHeaders.map((header) => (
                        <tr key={header}>
                          <td style={{ padding: "0.4rem 0.6rem", borderBottom: "1px solid #f1f5f9", fontWeight: 500, whiteSpace: "nowrap" }}>{header}</td>
                          <td style={{ padding: "0.4rem 0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                            <select
                              value={columnMapping[header] || "skip"}
                              onChange={(e) => handleMappingChange(header, e.target.value)}
                              style={{ padding: "0.25rem 0.4rem", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "0.8rem" }}
                            >
                              {CONTACT_FIELDS.map((f) => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                          </td>
                          {csvPreview[0] && csvHeaders.slice(0, 3).map((h) => (
                            <td key={h} style={{ padding: "0.4rem 0.6rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.8rem", color: "#64748b", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {csvPreview[0][header] || "\u2014"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Preview rows */}
              {csvPreview.length > 1 && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: "0 0 0.5rem 0" }}>Preview ({csvPreview.length} of {csvPreview.length} rows shown)</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                      <thead>
                        <tr>
                          {csvHeaders.map((h) => (
                            <th key={h} style={{ textAlign: "left", padding: "0.3rem 0.5rem", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                              {h}
                              {columnMapping[h] !== "skip" && (
                                <span style={{ marginLeft: "4px", color: "#6366f1", fontWeight: 400 }}>({columnMapping[h]})</span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, ri) => (
                          <tr key={ri}>
                            {csvHeaders.map((h) => (
                              <td key={h} style={{ padding: "0.3rem 0.5rem", borderBottom: "1px solid #f1f5f9", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {row[h] || "\u2014"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import button */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button
                  className="btn btn-primary"
                  onClick={handleImport}
                  disabled={!hasEmailMapped || importing}
                >
                  {importing ? "Importing..." : `Import Contacts from CSV`}
                </button>
                {!hasEmailMapped && (
                  <span style={{ fontSize: "0.8rem", color: "#991b1b" }}>
                    Please map at least one column to Email
                  </span>
                )}
              </div>
            </>
          )}

          {importResult && (
            <div style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: "6px", fontSize: "0.85rem", background: importResult.error ? "#fef2f2" : "#f0fdf4", border: `1px solid ${importResult.error ? "#fecaca" : "#bbf7d0"}`, color: importResult.error ? "#991b1b" : "#166534" }}>
              {importResult.error ? (
                <p style={{ margin: 0 }}>Error: {importResult.error}</p>
              ) : (
                <p style={{ margin: 0 }}>
                  {'\u2705'} Import complete &mdash; <strong>{importResult.imported}</strong> imported, <strong>{importResult.skipped}</strong> skipped
                  {importResult.errors?.length > 0 && (
                    <span style={{ display: "block", marginTop: "0.25rem", fontSize: "0.8rem", color: "#991b1b" }}>
                      {importResult.errors.length} error(s) occurred
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
