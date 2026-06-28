"use client";

import { useCallback, useEffect, useState } from "react";
import AdminEmailStats from "@/app/components/admin-email-stats";

// ── Types ────────────────────────────────────────────────

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  subscription: string;
  createdAt: string;
};

type Domain = {
  id: string;
  ownerId: string;
  domain: string;
  status: string;
  createdAt: string;
};

type Mailbox = {
  id: string;
  ownerId: string;
  domainId: string;
  email: string;
  name: string;
  quotaMb: number;
  createdAt: string;
};

type Alias = {
  id: string;
  ownerId: string;
  domainId: string;
  address: string;
  goto: string;
  active: boolean;
  createdAt: string;
};

type AdminData = {
  users: User[];
  domains: Domain[];
  mailboxes: Mailbox[];
  aliases: Alias[];
};

type Tab = "users" | "domains" | "mailboxes" | "aliases";

type ConfirmAction = {
  type: "user" | "domain" | "mailbox";
  id: string;
  label: string;
};

// ── Helpers ──────────────────────────────────────────────

function statusClass(status: string) {
  return `badge status-${status}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Component ────────────────────────────────────────────

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("users");
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as AdminData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete() {
    if (!confirm) return;
    setDeleting(true);
    setStatusMsg(null);

    try {
      const endpoint =
        confirm.type === "user"
          ? `/api/admin/users/${confirm.id}`
          : confirm.type === "domain"
          ? `/api/admin/domains/${confirm.id}`
          : `/api/admin/mailboxes/${confirm.id}`;

      const headers: Record<string, string> = {};
      const csrfToken = sessionStorage.getItem("csrfToken");
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }

      const res = await fetch(endpoint, { method: "DELETE", headers });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      setStatusMsg({ type: "success", text: `Deleted ${confirm.label}` });
      setConfirm(null);
      fetchData();
    } catch (err) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Delete failed.",
      });
    } finally {
      setDeleting(false);
    }
  }

  // ── Derived stats ──────────────────────────────────────

  const stats = data
    ? [
        { label: "Users", value: data.users.length, icon: "👤", cls: "domains" },
        { label: "Domains", value: data.domains.length, icon: "🌐", cls: "mailboxes" },
        { label: "Mailboxes", value: data.mailboxes.length, icon: "📬", cls: "aliases" },
        { label: "Aliases", value: data.aliases.length, icon: "↪", cls: "active" },
      ]
    : [];

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "users", label: "Users", count: data?.users.length ?? 0 },
    { key: "domains", label: "Domains", count: data?.domains.length ?? 0 },
    { key: "mailboxes", label: "Mailboxes", count: data?.mailboxes.length ?? 0 },
    { key: "aliases", label: "Aliases", count: data?.aliases.length ?? 0 },
  ];

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="stack">
      {/* Header */}
      <section className="page-heading">
        <h1>Superadmin panel</h1>
        <p>Full platform overview — all users, domains, mailboxes, and aliases.</p>
      </section>

      {/* Status message */}
      {statusMsg && (
        <div className={`dash-message ${statusMsg.type}`}>
          <span>{statusMsg.type === "error" ? "⚠" : "✓"}</span> {statusMsg.text}
          <button className="button small ghost" onClick={() => setStatusMsg(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="dash-message error">
          <span>⚠</span> {error}
          <button className="button small ghost" onClick={fetchData}>
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="empty-state">
          <p>Loading platform data…</p>
        </div>
      )}

      {data && (
        <>
          {/* Email Traffic Stats */}
          <AdminEmailStats />

          {/* Stats */}
          <section className="stats-grid">
            {stats.map((s) => (
              <div className="stat-card" key={s.label}>
                <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                <div className="stat-info">
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </div>
              </div>
            ))}
          </section>

          {/* Tabs */}
          <div className="dash-tabs">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`dash-tab ${tab === t.key ? "active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <span className="tab-count">{t.count}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {tab === "users" && (
              <UsersTab
                users={data.users}
                onDelete={(id, label) => setConfirm({ type: "user", id, label })}
              />
            )}
            {tab === "domains" && (
              <DomainsTab
                domains={data.domains}
                users={data.users}
                onDelete={(id, label) => setConfirm({ type: "domain", id, label })}
              />
            )}
            {tab === "mailboxes" && (
              <MailboxesTab
                mailboxes={data.mailboxes}
                domains={data.domains}
                users={data.users}
                onDelete={(id, label) => setConfirm({ type: "mailbox", id, label })}
              />
            )}
            {tab === "aliases" && (
              <AliasesTab aliases={data.aliases} domains={data.domains} users={data.users} />
            )}
          </div>
        </>
      )}

      {/* Confirm Delete Modal */}
      {confirm && (
        <div className="modal-overlay" onClick={() => !deleting && setConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm delete</h2>
            <p className="modal-subtitle">
              {confirm.type === "domain"
                ? "This will permanently delete the domain and remove it from the mail server."
                : confirm.type === "mailbox"
                ? "This will permanently delete the mailbox and remove it from the mail server."
                : "This will permanently delete the user and remove their owned mailboxes, domains, and aliases."}
            </p>
            <p>
              Are you sure you want to delete <strong>{confirm.label}</strong>?
            </p>
            <div className="modal-actions">
              <button
                className="button"
                onClick={() => setConfirm(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="button danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Users Tab ────────────────────────────────────────────

function UsersTab({
  users,
  onDelete,
}: {
  users: User[];
  onDelete: (id: string, label: string) => void;
}) {
  if (users.length === 0) {
    return <div className="empty-row">No users registered yet.</div>;
  }

  return (
    <div className="panel table-panel">
      <div className="panel-header">
        <div>
          <h2>All Users</h2>
          <p>{users.length} total accounts</p>
        </div>
      </div>
      <div className="data-table">
        <div className="data-row" style={{ fontWeight: 600, color: "var(--ink-soft)", fontSize: 12 }}>
          <span>Email</span>
          <span>Name</span>
          <span>Role</span>
          <span>Subscription</span>
          <span>Created</span>
          <span></span>
        </div>
        {users.map((u) => (
          <div className="data-row" key={u.id}>
            <strong>{u.email}</strong>
            <span>{u.name}</span>
            <span>
              <span className={`badge ${u.role === "superadmin" ? "status-active" : ""}`}>
                {u.role}
              </span>
            </span>
            <span className="muted">{u.subscription}</span>
            <span className="muted">{formatDate(u.createdAt)}</span>
            <div className="row-actions">
              <button
                className="button danger small ghost"
                disabled={u.role === "superadmin"}
                onClick={() => onDelete(u.id, u.email)}
                title={u.role === "superadmin" ? "Superadmin users cannot be deleted here" : "Delete user"}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Domains Tab ──────────────────────────────────────────

function DomainsTab({
  domains,
  users,
  onDelete,
}: {
  domains: Domain[];
  users: User[];
  onDelete: (id: string, label: string) => void;
}) {
  const userMap = new Map(users.map((u) => [u.id, u]));

  if (domains.length === 0) {
    return <div className="empty-row">No domains registered yet.</div>;
  }

  return (
    <div className="panel table-panel">
      <div className="panel-header">
        <div>
          <h2>All Domains</h2>
          <p>{domains.length} total domains</p>
        </div>
      </div>
      <div className="data-table">
        <div className="data-row" style={{ fontWeight: 600, color: "var(--ink-soft)", fontSize: 12 }}>
          <span>Domain</span>
          <span>Status</span>
          <span>Owner</span>
          <span>Created</span>
          <span></span>
        </div>
        {domains.map((d) => {
          const owner = userMap.get(d.ownerId);
          return (
            <div className="data-row domain-row" key={d.id}>
              <strong>{d.domain}</strong>
              <span className={statusClass(d.status)}>{d.status}</span>
              <span className="muted">{owner?.email ?? d.ownerId.slice(0, 8)}</span>
              <span className="muted">{formatDate(d.createdAt)}</span>
              <div className="row-actions">
                <button
                  className="button danger small ghost"
                  onClick={() => onDelete(d.id, d.domain)}
                  title="Delete domain"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Mailboxes Tab ────────────────────────────────────────

function MailboxesTab({
  mailboxes,
  domains,
  users,
  onDelete,
}: {
  mailboxes: Mailbox[];
  domains: Domain[];
  users: User[];
  onDelete: (id: string, label: string) => void;
}) {
  const domainMap = new Map(domains.map((d) => [d.id, d]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  if (mailboxes.length === 0) {
    return <div className="empty-row">No mailboxes created yet.</div>;
  }

  return (
    <div className="panel table-panel">
      <div className="panel-header">
        <div>
          <h2>All Mailboxes</h2>
          <p>{mailboxes.length} total mailboxes</p>
        </div>
      </div>
      <div className="data-table">
        <div className="data-row" style={{ fontWeight: 600, color: "var(--ink-soft)", fontSize: 12 }}>
          <span>Email</span>
          <span>Name</span>
          <span>Domain</span>
          <span>Quota</span>
          <span>Owner</span>
          <span>Created</span>
          <span></span>
        </div>
        {mailboxes.map((m) => {
          const domain = domainMap.get(m.domainId);
          const owner = userMap.get(m.ownerId);
          return (
            <div className="data-row" key={m.id}>
              <strong>{m.email}</strong>
              <span className="muted">{m.name}</span>
              <span className="muted">{domain?.domain ?? "—"}</span>
              <span className="muted">{m.quotaMb} MB</span>
              <span className="muted">{owner?.email ?? m.ownerId.slice(0, 8)}</span>
              <span className="muted">{formatDate(m.createdAt)}</span>
              <div className="row-actions">
                <button
                  className="button danger small ghost"
                  onClick={() => onDelete(m.id, m.email)}
                  title="Delete mailbox"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Aliases Tab ──────────────────────────────────────────

function AliasesTab({
  aliases,
  domains,
  users,
}: {
  aliases: Alias[];
  domains: Domain[];
  users: User[];
}) {
  const domainMap = new Map(domains.map((d) => [d.id, d]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  if (aliases.length === 0) {
    return <div className="empty-row">No aliases created yet.</div>;
  }

  return (
    <div className="panel table-panel">
      <div className="panel-header">
        <div>
          <h2>All Aliases</h2>
          <p>{aliases.length} total aliases</p>
        </div>
      </div>
      <div className="data-table">
        <div className="data-row" style={{ fontWeight: 600, color: "var(--ink-soft)", fontSize: 12 }}>
          <span>Address</span>
          <span>Forwards To</span>
          <span>Active</span>
          <span>Domain</span>
          <span>Owner</span>
        </div>
        {aliases.map((a) => {
          const domain = domainMap.get(a.domainId);
          const owner = userMap.get(a.ownerId);
          return (
            <div className="data-row" key={a.id}>
              <strong>{a.address}</strong>
              <span className="muted">{a.goto}</span>
              <span>
                <span className={`badge ${a.active ? "status-active" : ""}`}>
                  {a.active ? "Active" : "Inactive"}
                </span>
              </span>
              <span className="muted">{domain?.domain ?? "—"}</span>
              <span className="muted">{owner?.email ?? a.ownerId.slice(0, 8)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
