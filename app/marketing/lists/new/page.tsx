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
      <div className="page-heading">
        <h1>New Mailing List</h1>
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
