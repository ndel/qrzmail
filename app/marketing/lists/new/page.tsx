"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewListPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/marketing/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (res.ok) router.push("/marketing/lists");
  };

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
            <h1>New Mailing List</h1>
            <p>Create a new mailing list for your contacts</p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="name">List Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="My Newsletter List" />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description (optional)</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this list for?" />
        </div>
        <button type="submit" className="btn btn-primary">Create List</button>
      </form>
    </main>
  );
}
