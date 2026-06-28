"use client";

import { useEffect, useState } from "react";
import Sidebar from "../sidebar";

interface Segment {
  id: string; name: string; description: string;
  rules: string; contact_count?: number;
  created_at: string;
}

interface Suggestion {
  name: string; rules: any[]; count: number;
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/marketing/api/segments")
      .then((r) => r.json())
      .then((data) => {
        setSegments(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/marketing/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), rules: [] }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create segment");
      }
      setShowForm(false);
      setName("");
      setDescription("");
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this segment?")) return;
    await fetch(`/marketing/api/segments/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="marketing-layout">
      <Sidebar />
      <main className="marketing-content">
        <div className="page">
          <div className="page-header">
            <div>
              <h1>Segments</h1>
              <p className="subtitle">Automatically segment your contacts based on rules</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ New Segment"}
            </button>
          </div>

          {error && <div className="warning" style={{ marginBottom: "1rem" }}>{error}</div>}

          {showForm && (
            <form onSubmit={handleCreate} className="provider-form" style={{ maxWidth: 500 }}>
              <div className="form-group">
                <label>Segment Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., VIP Customers" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Describe this segment..." />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Creating..." : "Create Segment"}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="loading-container"><div className="spinner" /><p>Loading segments...</p></div>
          ) : (
            <>
              {segments.length > 0 && (
                <div className="section">
                  <h2>Custom Segments</h2>
                  <div className="segments-grid">
                    {segments.map((s) => {
                      const rules = JSON.parse(s.rules || "[]");
                      return (
                        <div key={s.id} className="segment-card">
                          <div className="segment-header">
                            <h3>{s.name}</h3>
                            <span className="segment-count">{s.contact_count || 0} contacts</span>
                          </div>
                          {s.description && <p style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "0.5rem" }}>{s.description}</p>}
                          {rules.length > 0 && (
                            <div className="segment-rules">
                              {rules.map((r: any, i: number) => (
                                <span key={i} className="rule-tag">{r.field} {r.operator} {r.value}</span>
                              ))}
                            </div>
                          )}
                          <div className="segment-bar">
                            <div className="segment-bar-fill" style={{ width: `${Math.min(100, ((s.contact_count || 0) / 100) * 100)}%` }} />
                          </div>
                          <div style={{ marginTop: "0.75rem" }}>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>Delete</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="section">
                <h2>Auto-Suggested Segments</h2>
                <p className="form-hint" style={{ marginBottom: "1rem" }}>
                  These segments are automatically generated based on contact status and data. Select a list to see suggestions.
                </p>
                <ListSelector onSuggestionsChange={setSuggestions} />
                {suggestions.length > 0 && (
                  <div className="segments-grid" style={{ marginTop: "1rem" }}>
                    {suggestions.map((s, i) => (
                      <div key={i} className="segment-card">
                        <div className="segment-header">
                          <h3>{s.name}</h3>
                          <span className="segment-count">{s.count} contacts</span>
                        </div>
                        <div className="segment-rules">
                          {s.rules.map((r: any, j: number) => (
                            <span key={j} className="rule-tag">{r.field} {r.operator} {r.value}</span>
                          ))}
                        </div>
                        <div className="segment-bar">
                          <div className="segment-bar-fill" style={{ width: `${Math.min(100, (s.count / 100) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function ListSelector({ onSuggestionsChange }: { onSuggestionsChange: (s: Suggestion[]) => void }) {
  const [lists, setLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState("");

  useEffect(() => {
    fetch("/marketing/api/lists").then((r) => r.json()).then(setLists);
  }, []);

  useEffect(() => {
    if (!selectedList) { onSuggestionsChange([]); return; }
    fetch(`/marketing/api/segments?list_id=${selectedList}`)
      .then((r) => r.json())
      .then((data) => onSuggestionsChange(data.suggestions || []))
      .catch(() => onSuggestionsChange([]));
  }, [selectedList, onSuggestionsChange]);

  return (
    <div className="inline-form">
      <select className="filter-select" value={selectedList} onChange={(e) => setSelectedList(e.target.value)}>
        <option value="">Select a list...</option>
        {lists.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
    </div>
  );
}
