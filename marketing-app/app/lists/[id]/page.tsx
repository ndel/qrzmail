"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "../../sidebar";

interface ListDetail {
  id: string; name: string; description: string;
  total_contacts: number; active_contacts: number;
  created_at: string;
}

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [list, setList] = useState<ListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`/marketing/api/lists/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { router.push("/lists"); return; }
        setList(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [params.id, router]);

  const handleImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    setImportResult(null);
    try {
      const lines = importText.trim().split("\n").filter(Boolean);
      const contacts = lines.map((line) => {
        const parts = line.split(",").map((s) => s.trim());
        return { email: parts[0], name: parts[1] || "", company: parts[2] || "" };
      });

      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_id: params.id, contacts }),
      });
      const data = await res.json();
      setImportResult(data);
      setImportText("");
      load();
    } catch (err: any) {
      setImportResult({ imported: 0, skipped: 0 });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="marketing-layout">
        <Sidebar />
        <main className="marketing-content">
          <div className="loading-container"><div className="spinner" /><p>Loading list...</p></div>
        </main>
      </div>
    );
  }

  if (!list) return null;

  return (
    <div className="marketing-layout">
      <Sidebar />
      <main className="marketing-content">
        <div className="page">
          <div className="page-header">
            <div>
              <h1>{list.name}</h1>
              {list.description && <p className="subtitle">{list.description}</p>}
            </div>
            <Link href={`/contacts?list_id=${list.id}`} className="btn btn-secondary">View Contacts</Link>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{list.total_contacts}</div>
              <div className="stat-label">Total Contacts</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{list.active_contacts}</div>
              <div className="stat-label">Active</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{list.total_contacts - list.active_contacts}</div>
              <div className="stat-label">Inactive</div>
            </div>
          </div>

          <div className="section">
            <h2>Import Contacts</h2>
            <p className="form-hint" style={{ marginBottom: "0.75rem" }}>
              Paste contacts in CSV format: <code>email, name, company</code> (one per line)
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={6}
              placeholder={"john@example.com, John Doe, Acme Inc\njane@example.com, Jane Smith, Beta Corp"}
              className="import-form"
              style={{ width: "100%", padding: "0.75rem", border: "1px solid #d1d5db", borderRadius: "4px", fontFamily: "monospace", fontSize: "0.85rem" }}
            />
            <div className="form-actions" style={{ marginTop: "0.75rem" }}>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing || !importText.trim()}>
                {importing ? "Importing..." : "Import Contacts"}
              </button>
            </div>
            {importResult && (
              <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "4px", fontSize: "0.85rem" }}>
                Imported: <strong>{importResult.imported}</strong> | Skipped: <strong>{importResult.skipped}</strong>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
