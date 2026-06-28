"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface ListDetail {
  id: string;
  name: string;
  description?: string;
  total_contacts?: number;
  active_contacts?: number;
}

export default function ListDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [list, setList] = useState<ListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const load = () => {
    fetch(`/api/marketing/lists/${id}`)
      .then((r) => r.json())
      .then((data) => { setList(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleImport = async () => {
    const lines = csvText.split("\n").filter((l) => l.trim());
    const contacts = lines.map((line) => {
      const parts = line.split(",").map((s) => s.trim());
      return { email: parts[0], name: parts[1] || "", company: parts[2] || "" };
    }).filter((c) => c.email);

    if (contacts.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/marketing/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_id: id, contacts }),
      });
      const data = await res.json();
      setImportResult(data);
      setCsvText("");
      load();
    } catch (err: any) {
      setImportResult({ error: err.message });
    }
    setImporting(false);
  };

  if (loading) return <main className="marketing-content"><p>Loading...</p></main>;
  if (!list) return <main className="marketing-content"><p>List not found</p></main>;

  return (
    <main className="marketing-content">
      <div className="page-heading">
        <h1>{list.name}</h1>
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
