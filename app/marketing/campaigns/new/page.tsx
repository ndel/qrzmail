"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCampaignPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [providerId, setProviderId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [listId, setListId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/marketing/providers").then((r) => r.json()),
      fetch("/api/marketing/templates").then((r) => r.json()),
      fetch("/api/marketing/lists").then((r) => r.json()),
    ]).then(([p, t, l]) => {
      setProviders(p);
      setTemplates(t);
      setLists(l);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/marketing/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, provider_id: providerId, template_id: templateId, list_id: listId, scheduled_at: scheduledAt || null }),
    });
    if (res.ok) {
      router.push("/marketing/campaigns");
    }
  };

  return (
    <main className="marketing-content">
      <div className="page-heading">
        <h1>New Campaign</h1>
      </div>

      {providers.length === 0 ? (
        <div className="empty-state">
          <p>You need to add an SMTP provider first.</p>
          <a href="/marketing/providers" className="btn btn-primary">Add Provider</a>
        </div>
      ) : templates.length === 0 ? (
        <div className="empty-state">
          <p>You need to create a template first.</p>
          <a href="/marketing/templates/new" className="btn btn-primary">Create Template</a>
        </div>
      ) : lists.length === 0 ? (
        <div className="empty-state">
          <p>You need to create a mailing list first.</p>
          <a href="/marketing/lists/new" className="btn btn-primary">Create List</a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card">
          <div className="form-group">
            <label htmlFor="name">Campaign Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="My Campaign" />
          </div>
          <div className="form-group">
            <label htmlFor="provider">SMTP Provider</label>
            <select id="provider" value={providerId} onChange={(e) => setProviderId(e.target.value)} required>
              <option value="">Select provider...</option>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.smtp_host})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="template">Email Template</label>
            <select id="template" value={templateId} onChange={(e) => setTemplateId(e.target.value)} required>
              <option value="">Select template...</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="list">Mailing List</label>
            <select id="list" value={listId} onChange={(e) => setListId(e.target.value)} required>
              <option value="">Select list...</option>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.total_contacts || 0} contacts)</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="scheduled">Schedule (optional)</label>
            <input id="scheduled" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary">Create Campaign</button>
        </form>
      )}
    </main>
  );
}
