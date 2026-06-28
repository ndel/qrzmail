"use client";

import { useEffect, useState } from "react";

interface FoundContact {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  title?: string;
  source?: string;
}

export default function FindContactsPage() {
  const [lists, setLists] = useState<any[]>([]);
  const [niche, setNiche] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [count, setCount] = useState(20);
  const [results, setResults] = useState<FoundContact[]>([]);
  const [summary, setSummary] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [selectedList, setSelectedList] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/marketing/lists").then((r) => r.json()).then(setLists).catch(() => {});
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setError("");
    setResults([]);
    setImportResult(null);
    try {
      const res = await fetch("/api/marketing/contacts/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, api_key: apiKey, count }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else { setResults(data.contacts || []); setSummary(data.summary || ""); }
    } catch (err: any) { setError(err.message); }
    setSearching(false);
  };

  const handleImport = async () => {
    if (!selectedList || results.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/marketing/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          list_id: selectedList,
          contacts: results.map((c) => ({
            email: c.email,
            name: c.name || "",
            company: c.company || "",
            phone: c.phone || "",
            custom_fields: { title: c.title || "", source: c.source || "" },
          })),
        }),
      });
      const data = await res.json();
      setImportResult(data);
    } catch (err: any) { setError(err.message); }
    setImporting(false);
  };

  return (
    <main className="marketing-content">
      <div className="page-heading">
        <h1>Find Contacts</h1>
      </div>

      <form onSubmit={handleSearch} className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="form-group">
          <label>Niche / Description</label>
          <textarea
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g., SaaS founders in the US, real estate agents in Florida, etc."
            required
            style={{ minHeight: "60px" }}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>DeepSeek API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required placeholder="sk-..." />
          </div>
          <div className="form-group" style={{ width: "120px" }}>
            <label>Count</label>
            <input type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} min={1} max={50} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={searching}>
          {searching ? "Searching..." : "🔍 Find Contacts"}
        </button>
      </form>

      {error && <div className="card" style={{ marginBottom: "1rem", border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b" }}>{error}</div>}

      {results.length > 0 && (
        <>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <p style={{ margin: "0 0 0.75rem 0", fontWeight: 600 }}>{summary}</p>
            <div className="inline-form">
              <div className="form-group">
                <select className="filter-select" value={selectedList} onChange={(e) => setSelectedList(e.target.value)}>
                  <option value="">Select list to import to...</option>
                  {lists.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" onClick={handleImport} disabled={!selectedList || importing}>
                {importing ? "Importing..." : `Import ${results.length} contacts`}
              </button>
            </div>
            {importResult && (
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.85rem", color: "#166534" }}>
                ✅ Imported: {importResult.imported}, Skipped: {importResult.skipped}
              </p>
            )}
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "30px" }}>#</th>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Title</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {results.map((c, i) => (
                  <tr key={i}>
                    <td style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{i + 1}</td>
                    <td>{c.email}</td>
                    <td>{c.name || "—"}</td>
                    <td>{c.company || "—"}</td>
                    <td style={{ fontSize: "0.8rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title || "—"}</td>
                    <td style={{ fontSize: "0.75rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>{c.source || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
