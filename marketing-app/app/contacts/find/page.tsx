"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../sidebar";

interface FoundContact {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  title?: string;
  source?: string;
}

interface List {
  id: string; name: string;
}

export default function FindContactsPage() {
  const router = useRouter();
  const [niche, setNiche] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [count, setCount] = useState(20);
  const [lists, setLists] = useState<List[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<FoundContact[] | null>(null);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [savedApiKey, setSavedApiKey] = useState("");

  useEffect(() => {
    fetch("/marketing/api/lists")
      .then((r) => r.json())
      .then((data) => {
        setLists(data);
        if (data.length > 0) setSelectedListId(data[0].id);
      });
    // Load saved API key from localStorage
    const saved = localStorage.getItem("deepseek_api_key");
    if (saved) {
      setSavedApiKey(saved);
      setApiKey(saved);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim() || !apiKey.trim()) return;

    setSearching(true);
    setError("");
    setResults(null);
    setSummary("");
    setImportResult(null);

    // Save API key to localStorage
    localStorage.setItem("deepseek_api_key", apiKey);
    setSavedApiKey(apiKey);

    try {
      const res = await fetch("/marketing/api/contacts/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: niche.trim(), api_key: apiKey, count }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data.contacts || []);
        setSummary(data.summary || "");
      }
    } catch (err: any) {
      setError(err.message || "Failed to search for contacts");
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async () => {
    if (!selectedListId || !results || results.length === 0) return;

    setImporting(true);
    setImportResult(null);

    try {
      const res = await fetch("/marketing/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          list_id: selectedListId,
          contacts: results.map((c) => ({
            email: c.email,
            name: c.name || "",
            company: c.company || "",
            phone: c.phone || "",
            custom_fields: {
              title: c.title || "",
              source: c.source || "",
            },
          })),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setImportResult({ imported: data.imported, skipped: data.skipped });
      }
    } catch (err: any) {
      setError(err.message || "Failed to import contacts");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="marketing-layout">
      <Sidebar />
      <main className="marketing-content">
        <div className="page">
          <div className="page-header">
            <div>
              <h1>Find Contacts</h1>
              <p className="subtitle">Use AI to discover contacts for any niche</p>
            </div>
          </div>

          <div className="section">
            <form onSubmit={handleSearch} className="find-form">
              <div className="form-group">
                <label htmlFor="niche">Describe your target niche</label>
                <textarea
                  id="niche"
                  className="form-input"
                  rows={3}
                  placeholder='e.g. "real estate agents in California", "SaaS founders in Europe", "digital marketing agencies in London"'
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="apiKey">DeepSeek API Key</label>
                  <input
                    id="apiKey"
                    type="password"
                    className="form-input"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                  />
                  {savedApiKey && <small style={{ color: "#22c55e" }}>✓ Key saved locally</small>}
                </div>
                <div className="form-group" style={{ width: "120px" }}>
                  <label htmlFor="count">Count</label>
                  <select
                    id="count"
                    className="form-input"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={searching || !niche.trim() || !apiKey.trim()}>
                {searching ? (
                  <><span className="spinner-sm" /> Searching...</>
                ) : (
                  "🔍 Find Contacts"
                )}
              </button>
            </form>
          </div>

          {error && (
            <div className="alert alert-error">
              <strong>Error:</strong> {error}
            </div>
          )}

          {searching && (
            <div className="section">
              <div className="loading-container">
                <div className="spinner" />
                <p>Searching for contacts using AI...</p>
                <small style={{ color: "#666" }}>This may take 10-30 seconds</small>
              </div>
            </div>
          )}

          {results && !searching && (
            <div className="section">
              <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2>Results {summary && <small style={{ fontWeight: "normal", color: "#666", fontSize: "0.85rem" }}>— {summary}</small>}</h2>
                <span className="badge badge-active">{results.length} contacts</span>
              </div>

              {importResult && (
                <div className="alert alert-success" style={{ marginBottom: "1rem" }}>
                  ✅ Successfully imported <strong>{importResult.imported}</strong> contacts ({importResult.skipped} skipped due to duplicates)
                </div>
              )}

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "30px" }}>
                        <input
                          type="checkbox"
                          checked={true}
                          readOnly
                        />
                      </th>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Company</th>
                      <th>Title</th>
                      <th>Phone</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((c, i) => (
                      <tr key={i}>
                        <td><input type="checkbox" checked readOnly /></td>
                        <td>{c.email}</td>
                        <td>{c.name || "-"}</td>
                        <td>{c.company || "-"}</td>
                        <td>{c.title || "-"}</td>
                        <td>{c.phone || "-"}</td>
                        <td style={{ fontSize: "0.8rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.source ? (
                            <a href={c.source} target="_blank" rel="noopener noreferrer">{c.source.length > 30 ? c.source.substring(0, 30) + "..." : c.source}</a>
                          ) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="import-bar" style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <select
                  className="form-input"
                  style={{ width: "auto", minWidth: "200px" }}
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                >
                  <option value="">Select a list...</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <button
                  className="btn btn-primary"
                  onClick={handleImport}
                  disabled={importing || !selectedListId}
                >
                  {importing ? "Importing..." : "📥 Import to List"}
                </button>
                {lists.length === 0 && (
                  <small style={{ color: "#f59e0b" }}>No lists available. Create a list first.</small>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
