"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../sidebar";

export default function NewListPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create list");
      }
      router.push("/lists");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="marketing-layout">
      <Sidebar />
      <main className="marketing-content">
        <div className="page">
          <div className="page-header">
            <div>
              <h1>New Contact List</h1>
              <p className="subtitle">Create a new list to organize your contacts</p>
            </div>
          </div>

          {error && <div className="warning" style={{ marginBottom: "1rem" }}>{error}</div>}

          <form onSubmit={handleSubmit} className="provider-form" style={{ maxWidth: 500 }}>
            <div className="form-group">
              <label>List Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Newsletter Subscribers" required />
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this list for?" />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
                {saving ? "Creating..." : "Create List"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
