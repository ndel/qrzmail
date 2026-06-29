"use client";

import { useEffect, useState } from "react";

interface Segment {
  id: string;
  name: string;
  description?: string;
  rules: string;
  contact_count?: number;
  created_at: string;
}

interface Suggestion {
  name: string;
  rules: Array<{ field: string; operator: string; value: string }>;
  count: number;
}

function ListSelector({ onSuggestionsChange }: { onSuggestionsChange: (s: Suggestion[]) => void }) {
  const [lists, setLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState("");

  useEffect(() => {
    fetch("/api/marketing/lists").then((r) => r.json()).then(setLists).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedList) {
      fetch(`/api/marketing/segments?list_id=${selectedList}`)
        .then((r) => r.json())
        .then((data) => onSuggestionsChange(data.suggestions || []))
        .catch(() => onSuggestionsChange([]));
    } else {
      onSuggestionsChange([]);
    }
  }, [selectedList, onSuggestionsChange]);

  return (
    <div className="inline-form">
      <div className="form-group">
        <select className="filter-select" value={selectedList} onChange={(e) => setSelectedList(e.target.value)}>
          <option value="">Select a list for suggestions...</option>
          {lists.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
    </div>
  );
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const load = () => {
    fetch("/api/marketing/segments")
      .then((r) => r.json())
      .then((data) => { setSegments(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/marketing/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDescription }),
    });
    if (res.ok) {
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      load();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this segment?")) return;
    await fetch(`/api/marketing/segments/${id}`, { method: "DELETE" });
    load();
  };

  const handleCreateFromSuggestion = async (suggestion: Suggestion) => {
    const res = await fetch("/api/marketing/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: suggestion.name, description: `Auto-generated: ${suggestion.name}`, rules: suggestion.rules }),
    });
    if (res.ok) load();
  };

  return (
    <main className="marketing-content">
      <div className="panel-header-row" style={{ marginBottom: "28px" }}>
        <div className="panel-header-left">
          <div className="panel-icon" style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.05))", border: "1px solid rgba(251,191,36,0.15)", color: "#fbbf24" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <div className="panel-header-text">
            <h1>Segments</h1>
            <p>Create targeted segments to refine your audience</p>
          </div>
        </div>
        <div className="panel-header-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "Cancel" : "+ New Segment"}
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="form-group">
            <label>Segment Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="VIP Customers" />
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="High-value contacts" />
          </div>
          <button type="submit" className="btn btn-primary">Create Segment</button>
        </form>
      )}

      <div className="section">
        <h2 className="section-title">Suggested Segments</h2>
        <ListSelector onSuggestionsChange={setSuggestions} />
        {suggestions.length > 0 && (
          <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.75rem" }}>
            {suggestions.map((s, i) => (
              <div key={i} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem" }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "#64748b" }}>{s.count} contacts</span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => handleCreateFromSuggestion(s)}>Create</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <h2 className="section-title">Your Segments</h2>
        {loading ? (
          <p>Loading...</p>
        ) : segments.length === 0 ? (
          <div className="empty-state"><p>No segments yet. Create one or use a suggestion above.</p></div>
        ) : (
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {segments.map((s) => {
              const rules = JSON.parse(s.rules || "[]");
              return (
                <div key={s.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    {s.description && <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "#64748b" }}>{s.description}</span>}
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                      {rules.length > 0 ? `${rules.length} rule(s)` : "No rules"} · {s.contact_count || 0} contacts
                    </div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>Delete</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
