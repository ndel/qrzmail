"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "../../sidebar";

interface Provider { id: string; name: string; smtp_host: string; }
interface Template { id: string; name: string; subject: string; }
interface List { id: string; name: string; total_contacts: number; active_contacts: number; }

export default function NewCampaignPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [providerId, setProviderId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [listId, setListId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/providers").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/lists").then((r) => r.json()),
    ]).then(([p, t, l]) => {
      setProviders(p);
      setTemplates(t);
      setLists(l);
    }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !providerId || !templateId || !listId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          provider_id: providerId,
          template_id: templateId,
          list_id: listId,
          scheduled_at: scheduledAt || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create campaign");
      }
      router.push("/campaigns");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="marketing-layout">
        <Sidebar />
        <main className="marketing-content">
          <div className="loading-container"><div className="spinner" /><p>Loading...</p></div>
        </main>
      </div>
    );
  }

  const selectedList = lists.find((l) => l.id === listId);

  return (
    <div className="marketing-layout">
      <Sidebar />
      <main className="marketing-content">
        <div className="page">
          <div className="page-header">
            <div>
              <h1>New Campaign</h1>
              <p className="subtitle">Configure and launch a new email campaign</p>
            </div>
          </div>

          {error && <div className="warning" style={{ marginBottom: "1rem" }}>{error}</div>}

          {providers.length === 0 ? (
            <div className="empty-state">
              <p>You need to configure an SMTP/IMAP provider first.</p>
              <Link href="/providers" className="btn btn-primary">Configure Provider</Link>
            </div>
          ) : templates.length === 0 ? (
            <div className="empty-state">
              <p>You need to create an email template first.</p>
              <Link href="/templates/new" className="btn btn-primary">Create Template</Link>
            </div>
          ) : lists.length === 0 ? (
            <div className="empty-state">
              <p>You need to create a contact list first.</p>
              <Link href="/lists/new" className="btn btn-primary">Create List</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="campaign-form" style={{ maxWidth: 600 }}>
              <div className="form-group">
                <label>Campaign Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., March Newsletter" required />
              </div>

              <div className="form-group">
                <label>SMTP Provider</label>
                <select value={providerId} onChange={(e) => setProviderId(e.target.value)} required>
                  <option value="">Select a provider...</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.smtp_host})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Email Template</label>
                <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} required>
                  <option value="">Select a template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} - {t.subject}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Contact List</label>
                <select value={listId} onChange={(e) => setListId(e.target.value)} required>
                  <option value="">Select a list...</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.active_contacts} active)</option>
                  ))}
                </select>
                {selectedList && (
                  <p className="form-hint">
                    This campaign will be sent to {selectedList.active_contacts} active contacts out of {selectedList.total_contacts} total.
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Schedule (optional)</label>
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                <p className="form-hint">Leave empty to send immediately when you click &quot;Send&quot; from the campaign list.</p>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Creating..." : "Create Campaign"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
