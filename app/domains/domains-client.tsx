"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

// ── CSRF Helper ──────────────────────────────────────────────────────────────

/**
 * Returns headers with the CSRF token for state-changing requests.
 * The token is stored in sessionStorage after login.
 */
function csrfHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = typeof window !== "undefined" ? sessionStorage.getItem("csrfToken") : null;
  if (token) {
    headers["x-csrf-token"] = token;
  }
  return headers;
}

type DomainRecord = {
  id: string;
  domain: string;
  status: "pending_dns" | "verified" | "active";
  verificationToken: string;
  dkim?: {
    selector: string;
    publicKey: string;
    privateKey: string;
    status: "pending_dns" | "active";
  };
};

type MailboxRecord = {
  id: string;
  domainId: string;
  email: string;
  name: string;
  quotaMb: number;
  recoveryEmail?: string;
};

type AliasRecord = {
  id: string;
  domainId: string;
  address: string;
  goto: string;
  active: boolean;
};

type State =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

type DkimDnsRecords = {
  mx: { type: string; host: string; value: string; priority: number };
  dkim: { type: string; host: string; value: string };
  spf: { type: string; host: string; value: string };
  dmarc: { type: string; host: string; value: string };
};

type ModalState =
  | { type: "closed" }
  | { type: "edit-mailbox"; mailbox: MailboxRecord }
  | { type: "reset-password"; mailbox: MailboxRecord }
  | { type: "delete-mailbox"; mailbox: MailboxRecord }
  | { type: "delete-domain"; domain: DomainRecord }
  | { type: "add-alias"; domainId: string }
  | { type: "edit-alias"; alias: AliasRecord }
  | { type: "delete-alias"; alias: AliasRecord }
  | { type: "dkim"; domain: DomainRecord; dnsRecords: DkimDnsRecords }
  | { type: "upgrade" };

type Tab = "domains" | "mailboxes" | "aliases";

const statusLabel: Record<DomainRecord["status"], string> = {
  pending_dns: "Needs DNS",
  verified: "Activating",
  active: "Active",
};

// ── SVG Icons ──

function IconGlobe() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
function IconServer() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <circle cx="6" cy="6" r="1" fill="currentColor" />
      <circle cx="6" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

function IconForward() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function IconKey() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconRefresh() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconDns() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

// ── Setup step indicator ──

type SetupStep = "add" | "verify" | "mx" | "dkim" | "mailbox";

const setupSteps: { key: SetupStep; label: string; icon: string }[] = [
  { key: "add", label: "Add Domain", icon: "＋" },
  { key: "verify", label: "Verify DNS", icon: "✓" },
  { key: "mx", label: "MX Record", icon: "↗" },
  { key: "dkim", label: "DKIM Keys", icon: "🛡" },
  { key: "mailbox", label: "Create Mailbox", icon: "✉" },
];

function getDomainSetupStep(domain: DomainRecord): SetupStep {
  if (domain.status === "pending_dns") return "verify";
  if (domain.status === "verified") return "mx";
  if (domain.status === "active" && !domain.dkim) return "dkim";
  if (domain.status === "active" && domain.dkim?.status === "pending_dns") return "dkim";
  if (domain.status === "active" && domain.dkim?.status === "active") return "mailbox";
  return "add";
}

function SetupProgress({ domain }: { domain: DomainRecord }) {
  const currentStep = getDomainSetupStep(domain);
  const stepIndex = setupSteps.findIndex((s) => s.key === currentStep);

  return (
    <div className="setup-progress">
      {setupSteps.map((step, i) => {
        const isComplete = i < stepIndex;
        const isCurrent = i === stepIndex;
        const isFuture = i > stepIndex;
        return (
          <div key={step.key} className={`setup-step ${isComplete ? "complete" : ""} ${isCurrent ? "current" : ""} ${isFuture ? "future" : ""}`}>
            <div className="setup-step-dot">
              {isComplete ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span>{step.icon}</span>
              )}
            </div>
            <span className="setup-step-label">{step.label}</span>
            {i < setupSteps.length - 1 && <div className={`setup-step-line ${isComplete ? "complete" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ──

export default function DomainsClient() {
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [mailboxes, setMailboxes] = useState<MailboxRecord[]>([]);
  const [aliases, setAliases] = useState<AliasRecord[]>([]);
  const [state, setState] = useState<State>({ type: "loading" });
  const [modal, setModal] = useState<ModalState>({ type: "closed" });
  const [activeTab, setActiveTab] = useState<Tab>("domains");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());
  const [subscription, setSubscription] = useState<string | null>(null);
  const [mailboxDomainId, setMailboxDomainId] = useState<string>("");

  const activeDomains = useMemo(
    () => domains.filter((domain) => domain.status === "active"),
    [domains],
  );

  async function loadData() {
    const response = await fetch("/api/domains", { cache: "no-store" });
    const result = await response.json();
    if (response.status === 401) { window.location.href = "/domains/login"; return; }
    if (!response.ok) { setState({ type: "error", message: result.error ?? "Could not load domains." }); return; }
    setDomains(result.domains);
    setMailboxes(result.mailboxes);
    setAliases(result.aliases ?? []);
    setState({ type: "idle" });
    // Fetch subscription status
    try {
      const meRes = await fetch("/api/account/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user) setSubscription(meData.user.subscription);
      }
    } catch { /* ignore */ }
  }

  useEffect(() => { void loadData(); }, []);

  async function handleLogout() {
    await fetch("/api/account/logout", { method: "POST", headers: csrfHeaders() });
    window.location.href = "/domains/login";
  }

  async function handleSendResetEmail(mailboxId: string) {
    setState({ type: "loading" });
    const response = await fetch("/api/mailboxes/send-reset", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ mailboxId }),
    });
    const result = await response.json();
    if (!response.ok) {
      setState({ type: "error", message: result.error ?? "Could not send reset email." });
      return;
    }
    setState({ type: "success", message: result.message ?? "Reset email sent." });
  }

  async function addDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ type: "loading" });
    const form = event.currentTarget;
    const response = await fetch("/api/domains", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const result = await response.json();
    if (!response.ok) { setState({ type: "error", message: result.error ?? "Could not add domain." }); return; }
    form.reset();
    setState({ type: "success", message: "Domain added. Add the TXT record shown below, then click Verify DNS." });
    await loadData();
  }

  async function verifyDomain(id: string) {
    setState({ type: "loading" });
    const response = await fetch(`/api/domains/${id}/verify`, { method: "POST", headers: csrfHeaders() });
    const result = await response.json();
    if (!response.ok) { setState({ type: "error", message: result.error ?? "DNS verification failed." }); return; }
    setState({ type: "success", message: "Domain verified and activated. You can create mailboxes now." });
    await loadData();
  }

  async function addMailbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ type: "loading" });
    const form = event.currentTarget;
    const response = await fetch("/api/mailboxes", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const result = await response.json();
    if (!response.ok) { setState({ type: "error", message: result.error ?? "Could not create mailbox." }); return; }
    form.reset();
    const email = result.mailbox?.email ?? "Mailbox";
    setState({ type: "success", message: `${email} was created.` });
    window.scrollTo({ top: 0, behavior: "smooth" });
    try { await loadData(); } catch { /* ignore */ }
  }

  async function handleEditMailbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (modal.type !== "edit-mailbox") return;
    setState({ type: "loading" });
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const body: Record<string, unknown> = {};
    if (data.name) body.name = data.name;
    if (data.quotaMb) body.quotaMb = Number(data.quotaMb);
    // Always send recoveryEmail so it can be cleared (set to empty string)
    body.recoveryEmail = (data.recoveryEmail as string) ?? "";
    const response = await fetch(`/api/mailboxes/${modal.mailbox.id}`, {
      method: "PATCH",
      headers: csrfHeaders(),
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) { setState({ type: "error", message: result.error ?? "Could not update mailbox." }); return; }
    setModal({ type: "closed" });
    setState({ type: "success", message: `${modal.mailbox.email} was updated.` });
    await loadData();
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (modal.type !== "reset-password") return;
    setState({ type: "loading" });
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/mailboxes/reset-password", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ mailboxId: modal.mailbox.id, password: data.password }),
    });
    const result = await response.json();
    if (!response.ok) { setState({ type: "error", message: result.error ?? "Could not reset password." }); return; }
    setModal({ type: "closed" });
    setState({ type: "success", message: `Password for ${modal.mailbox.email} was reset.` });
    await loadData();
  }

  async function handleDeleteMailbox() {
    if (modal.type !== "delete-mailbox") return;
    setState({ type: "loading" });
    const response = await fetch(`/api/mailboxes/${modal.mailbox.id}`, { method: "DELETE", headers: csrfHeaders() });
    const result = await response.json();
    if (!response.ok) { setState({ type: "error", message: result.error ?? "Could not delete mailbox." }); return; }
    setModal({ type: "closed" });
    setState({ type: "success", message: `${modal.mailbox.email} was deleted.` });
    await loadData();
  }

  async function handleDeleteDomain() {
    if (modal.type !== "delete-domain") return;
    setState({ type: "loading" });
    const response = await fetch(`/api/domains/${modal.domain.id}`, { method: "DELETE", headers: csrfHeaders() });
    const result = await response.json();
    if (!response.ok) { setState({ type: "error", message: result.error ?? "Could not delete domain." }); return; }
    setModal({ type: "closed" });
    setState({ type: "success", message: `${modal.domain.domain} was deleted.` });
    await loadData();
  }

  async function handleGenerateDkim(domainId: string) {
    setState({ type: "loading" });
    const response = await fetch(`/api/domains/${domainId}/dkim`, { method: "POST", headers: csrfHeaders() });
    const result = await response.json();
    if (!response.ok) { setState({ type: "error", message: result.error ?? "Could not generate DKIM keys." }); return; }
    setState({ type: "success", message: "DKIM keys generated. Add the DNS records below to enable email authentication." });
    setModal({ type: "dkim", domain: domains.find((d) => d.id === domainId)!, dnsRecords: result.dnsRecords });
    await loadData();
  }

  async function handleVerifyDkim(domainId: string) {
    setState({ type: "loading" });
    const response = await fetch(`/api/domains/${domainId}/dkim`, { method: "PATCH", headers: csrfHeaders() });
    const result = await response.json();
    if (!response.ok) { setState({ type: "error", message: result.error ?? "DKIM verification failed." }); return; }
    setState({ type: "success", message: result.message ?? "DKIM DNS record verified. Email authentication is now active." });
    await loadData();
  }

  async function handleAddAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (modal.type !== "add-alias") return;
    setState({ type: "loading" });
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const domain = activeDomains.find((d) => d.id === data.domainId);
    const fullAddress = domain ? `${data.address}@${domain.domain}` : data.address;
    const response = await fetch("/api/aliases", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ domainId: modal.domainId, address: fullAddress, goto: data.goto }),
    });
    const result = await response.json();
    if (!response.ok) { setState({ type: "error", message: result.error ?? "Could not create alias." }); return; }
    setModal({ type: "closed" });
    setState({ type: "success", message: `Alias ${result.alias.address} was created.` });
    await loadData();
  }

  async function handleEditAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (modal.type !== "edit-alias") return;
    setState({ type: "loading" });
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const body: Record<string, unknown> = {};
    if (data.goto) body.goto = data.goto;
    body.active = data.active === "1";
    const response = await fetch(`/api/aliases/${modal.alias.id}`, {
      method: "PATCH",
      headers: csrfHeaders(),
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) { setState({ type: "error", message: result.error ?? "Could not update alias." }); return; }
    setModal({ type: "closed" });
    setState({ type: "success", message: `Alias ${modal.alias.address} was updated.` });
    await loadData();
  }

  async function handleDeleteAlias() {
    if (modal.type !== "delete-alias") return;
    setState({ type: "loading" });
    const response = await fetch(`/api/aliases/${modal.alias.id}`, { method: "DELETE", headers: csrfHeaders() });
    const result = await response.json();
    if (!response.ok) { setState({ type: "error", message: result.error ?? "Could not delete alias." }); return; }
    setModal({ type: "closed" });
    setState({ type: "success", message: `Alias ${modal.alias.address} was deleted.` });
    await loadData();
  }

  async function handleUpgrade(plan: string) {
    setState({ type: "loading" });
    const response = await fetch("/api/account/upgrade", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ plan }),
    });
    const result = await response.json();
    if (!response.ok) { setState({ type: "error", message: result.error ?? "Upgrade request failed." }); return; }
    setModal({ type: "closed" });
    setSubscription("pending");
    setState({ type: "success", message: result.message ?? "Upgrade requested. An admin will verify your request shortly." });
  }

  const aliasesByDomain = useMemo(() => {
    const map = new Map<string, AliasRecord[]>();
    for (const alias of aliases) { const list = map.get(alias.domainId) ?? []; list.push(alias); map.set(alias.domainId, list); }
    return map;
  }, [aliases]);

  async function copyToClipboard(text: string, index: number) {
    try { await navigator.clipboard.writeText(text); } catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <div className="domains-dashboard">
      {/* Page Header */}
      <div className="dash-header">
        <div className="dash-header-left">
          <div className="dash-icon-wrap"><IconGlobe /></div>
          <div>
            <h1>Domain Management</h1>
            <p>Manage your domains, mailboxes, and email aliases in one place.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {subscription === "free" && (
            <button className="button primary" onClick={() => setModal({ type: "upgrade" })} type="button" style={{ fontSize: "13px", minHeight: "36px", padding: "0 14px" }}>
              Upgrade Plan
            </button>
          )}
          {subscription === "pending" && (
            <span className="badge" style={{ background: "rgba(251,191,36,0.12)", color: "#fcd34d" }}>Pending Admin Verification</span>
          )}
          {subscription === "paid" && (
            <span className="badge" style={{ background: "rgba(34,197,94,0.12)", color: "#86efac" }}>Paid Plan</span>
          )}
          <button className="button ghost" onClick={() => { void loadData(); }} type="button" title="Refresh data">
            <IconRefresh /> Refresh
          </button>
          <button className="button ghost" onClick={() => { void handleLogout(); }} type="button" title="Logout" style={{ color: "var(--ink-soft)" }}>
            Logout
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {state.type === "error" && (
        <div className="dash-message error"><IconX /><span>{state.message}</span></div>
      )}
      {state.type === "success" && (
        <div className="dash-message success"><IconCheck /><span>{state.message}</span></div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon domains"><IconGlobe /></div>
          <div className="stat-info"><strong>{domains.length}</strong><span>Domains</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon mailboxes"><IconMail /></div>
          <div className="stat-info"><strong>{mailboxes.length}</strong><span>Mailboxes</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon aliases"><IconForward /></div>
          <div className="stat-info"><strong>{aliases.length}</strong><span>Aliases</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active"><IconShield /></div>
          <div className="stat-info"><strong>{activeDomains.length}</strong><span>Active Domains</span></div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="dash-tabs">
        <button className={`dash-tab ${activeTab === "domains" ? "active" : ""}`} onClick={() => setActiveTab("domains")} type="button">
          <IconGlobe /> Domains {domains.length > 0 && <span className="tab-count">{domains.length}</span>}
        </button>
        <button className={`dash-tab ${activeTab === "mailboxes" ? "active" : ""}`} onClick={() => setActiveTab("mailboxes")} type="button">
          <IconMail /> Mailboxes {mailboxes.length > 0 && <span className="tab-count">{mailboxes.length}</span>}
        </button>
        <button className={`dash-tab ${activeTab === "aliases" ? "active" : ""}`} onClick={() => setActiveTab("aliases")} type="button">
          <IconForward /> Aliases {aliases.length > 0 && <span className="tab-count">{aliases.length}</span>}
        </button>
      </div>

      {/* ── DOMAINS TAB ── */}
      {activeTab === "domains" && (
        <div className="tab-content">
          {/* Add Domain Card */}
          <div className="dash-card add-domain-card">
            <div className="add-domain-form-wrap">
              <div className="add-domain-icon"><IconPlus /></div>
              <div>
                <h3>Add a New Domain</h3>
                <p>Enter your domain name to get started. We'll guide you through DNS verification and email setup.</p>
              </div>
            </div>
            <form className="add-domain-form" onSubmit={addDomain}>
              <div className="add-domain-input-group">
                <input id="domain" name="domain" placeholder="yourdomain.com" required className="add-domain-input" />
                <button className="button primary" disabled={state.type === "loading"} type="submit">
                  <IconPlus /> Add Domain
                </button>
              </div>
            </form>
          </div>

          {/* Domain List */}
          {domains.length === 0 && state.type !== "loading" && (
            <div className="empty-state">
              <IconGlobe />
              <h3>No domains yet</h3>
              <p>Add your first domain above to start managing email services.</p>
            </div>
          )}

          {domains.map((domain) => {
            const domainMailboxes = mailboxes.filter((m) => m.domainId === domain.id);
            const domainAliases = aliasesByDomain.get(domain.id) ?? [];

            return (
              <div className="domain-card-full" key={domain.id}>
                {/* Domain Header */}
                <div className="domain-card-header">
                  <div className="domain-card-title">
                    <div className="domain-name-row">
                      <strong className="domain-name">{domain.domain}</strong>
                      <span className={`badge status-${domain.status}`}>{statusLabel[domain.status]}</span>
                      {domain.dkim && (
                        <span className={`badge status-${domain.dkim.status}`}>
                          DKIM: {domain.dkim.status === "active" ? "Active" : "Pending DNS"}
                        </span>
                      )}
                    </div>
                    <div className="domain-meta">
                      <span>{domainMailboxes.length} mailbox{domainMailboxes.length !== 1 ? "s" : ""}</span>
                      <span className="meta-sep">&middot;</span>
                      <span>{domainAliases.length} alias{domainAliases.length !== 1 ? "es" : ""}</span>
                    </div>
                  </div>
                  <button className="button danger ghost" disabled={state.type === "loading"} onClick={() => setModal({ type: "delete-domain", domain })} type="button" title="Delete domain">
                    <IconTrash /> Delete
                  </button>
                </div>

                {/* Setup Progress */}
                <SetupProgress domain={domain} />

                {/* Setup Actions */}
                <div className="domain-actions">
                  {/* Verify DNS */}
                  {domain.status === "pending_dns" && (
                    <div className="domain-action-card">
                      <div className="action-card-header"><IconDns /><span>Step 1: Verify DNS Ownership</span></div>
                      <p>Add this TXT record at your domain provider to prove ownership.</p>
                      <div className="dns-record-display">
                        <div className="dns-field"><span className="dns-label">Type</span><code className="dns-value">TXT</code></div>
                        <div className="dns-field"><span className="dns-label">Host</span><code className="dns-value">_qrzmail</code></div>
                        <div className="dns-field"><span className="dns-label">Value</span><code className="dns-value dns-value-long">{domain.verificationToken}</code></div>
                        <button className="button ghost small" onClick={() => copyToClipboard(domain.verificationToken, 0)} type="button"><IconCopy />{copiedIndex === 0 ? "Copied!" : "Copy"}</button>
                      </div>
                      <button className="button primary" disabled={state.type === "loading"} onClick={() => verifyDomain(domain.id)} type="button"><IconCheck /> Verify DNS</button>
                    </div>
                  )}

                  {/* MX Record */}
                  {(domain.status === "verified" || domain.status === "active") && (
                    <div className="domain-action-card">
                      <div className="action-card-header"><IconArrowRight /><span>Step 2: Add MX Record</span></div>
                      <p>Add this MX record so your domain can receive emails.</p>
                      <div className="dns-record-display">
                        <div className="dns-field"><span className="dns-label">Type</span><code className="dns-value">MX</code></div>
                        <div className="dns-field"><span className="dns-label">Host</span><code className="dns-value">@</code></div>
                        <div className="dns-field"><span className="dns-label">Priority</span><code className="dns-value">10</code></div>
                        <div className="dns-field"><span className="dns-label">Value</span><code className="dns-value">mail.qrzmail.com</code></div>
                        <button className="button ghost small" onClick={() => copyToClipboard("mail.qrzmail.com", 1)} type="button"><IconCopy />{copiedIndex === 1 ? "Copied!" : "Copy"}</button>
                      </div>
                    </div>
                  )}

                  {/* Generate DKIM */}
                  {domain.status === "active" && !domain.dkim && (
                    <div className="domain-action-card">
                      <div className="action-card-header"><IconShield /><span>Step 3: Generate DKIM Keys</span></div>
                      <p>Enable email authentication to improve deliverability and prevent spoofing.</p>
                      <button className="button primary" disabled={state.type === "loading"} onClick={() => handleGenerateDkim(domain.id)} type="button"><IconShield /> Generate DKIM</button>
                    </div>
                  )}

                  {/* Verify DKIM DNS */}
                  {domain.dkim && domain.dkim.status === "pending_dns" && (
                    <div className="domain-action-card">
                      <div className="action-card-header"><IconDns /><span>Step 3: Verify DKIM DNS Record</span></div>
                      <p>Add the DKIM TXT record at your domain provider, then click verify.</p>
                      <div className="action-card-buttons">
                        <button className="button primary" disabled={state.type === "loading"} onClick={() => handleVerifyDkim(domain.id)} type="button"><IconCheck /> Verify DKIM DNS</button>
                        <button className="button" disabled={state.type === "loading"} onClick={() => {
                          const d = domain;
                          setModal({
                            type: "dkim",
                            domain: d,
                            dnsRecords: {
                              mx: { type: "MX", host: "@", value: "mail.qrzmail.com", priority: 10 },
                              dkim: { type: "TXT", host: `${d.dkim!.selector}._domainkey.${d.domain}`, value: `v=DKIM1; h=sha256; k=rsa; p=${d.dkim!.publicKey.replace(/-----BEGIN PUBLIC KEY-----/, "").replace(/-----END PUBLIC KEY-----/, "").replace(/\s+/g, "")}` },
                              spf: { type: "TXT", host: "@", value: "v=spf1 mx ip4:155.133.22.250 ~all" },
                              dmarc: { type: "TXT", host: `_dmarc.${d.domain}`, value: "v=DMARC1; p=none" },
                            },
                          });
                        }} type="button"><IconDns /> View DNS Records</button>
                      </div>
                    </div>
                  )}

                  {/* DKIM Active - show DNS records button */}
                  {domain.dkim && domain.dkim.status === "active" && (
                    <div className="domain-action-card">
                      <div className="action-card-header"><IconShield /><span>Email Authentication Active</span></div>
                      <p>Your domain is fully set up with DKIM signing. View the DNS records for reference.</p>
                      <button className="button" disabled={state.type === "loading"} onClick={() => {
                        const d = domain;
                        setModal({
                          type: "dkim",
                          domain: d,
                          dnsRecords: {
                            mx: { type: "MX", host: "@", value: "mail.qrzmail.com", priority: 10 },
                            dkim: { type: "TXT", host: `${d.dkim!.selector}._domainkey.${d.domain}`, value: `v=DKIM1; h=sha256; k=rsa; p=${d.dkim!.publicKey.replace(/-----BEGIN PUBLIC KEY-----/, "").replace(/-----END PUBLIC KEY-----/, "").replace(/\s+/g, "")}` },
                            spf: { type: "TXT", host: "@", value: "v=spf1 mx ip4:155.133.22.250 ~all" },
                            dmarc: { type: "TXT", host: `_dmarc.${d.domain}`, value: "v=DMARC1; p=none" },
                          },
                        });
                      }} type="button"><IconDns /> View DNS Records</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MAILBOXES TAB ── */}
      {activeTab === "mailboxes" && (
        <div className="tab-content">
          {/* Create Mailbox Form */}
          <div className="dash-card">
            <div className="add-domain-form-wrap">
              <div className="add-domain-icon"><IconMail /></div>
              <div>
                <h3>Create Mailbox</h3>
                <p>{activeDomains.length > 0 ? "Choose an active domain and create a new mailbox." : "Verify a domain first. Mailbox creation unlocks after the domain is active."}</p>
              </div>
            </div>
            <form className="create-mailbox-form" onSubmit={addMailbox}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="domainId">Domain</label>
                  <select id="domainId" name="domainId" required value={mailboxDomainId} onChange={(e) => setMailboxDomainId(e.target.value)}>
                    <option value="">Choose active domain</option>
                    {activeDomains.map((domain) => (
                      <option key={domain.id} value={domain.id}>{domain.domain}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="localPart">Mailbox</label>
                  <div className="input-suffix">
                    <input id="localPart" name="localPart" placeholder="support" required />
                    <span className="suffix">@{activeDomains.find((d) => d.id === mailboxDomainId)?.domain ?? "domain.com"}</span>
                  </div>
                  <p className="field-hint">Enter the local part only (e.g., "support"). The domain is already selected above.</p>
                </div>
                <div className="field">
                  <label htmlFor="name">Display name</label>
                  <input id="name" name="name" placeholder="Support" required />
                </div>
                <div className="field">
                  <label htmlFor="password">Password</label>
                  <input id="password" name="password" type="password" minLength={10} required />
                </div>
                <div className="field">
                  <label htmlFor="quotaMb">Quota MB</label>
                  <input id="quotaMb" name="quotaMb" type="number" defaultValue={3072} min={256} required />
                </div>
                <div className="field">
                  <label htmlFor="recoveryEmail">Recovery email <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>(optional)</span></label>
                  <input id="recoveryEmail" name="recoveryEmail" type="email" placeholder="backup@example.com" />
                  <p className="field-hint">Used for password reset if the mailbox password is forgotten.</p>
                </div>
              </div>
              <button className="button primary full" disabled={state.type === "loading" || activeDomains.length === 0} type="submit">
                <IconPlus /> Create Mailbox
              </button>
            </form>
          </div>

          {/* Mailboxes List */}
          {mailboxes.length === 0 && state.type !== "loading" && (
            <div className="empty-state">
              <IconMail />
              <h3>No mailboxes yet</h3>
              <p>Create your first mailbox above to start sending and receiving emails.</p>
            </div>
          )}

          {mailboxes.length > 0 && (
            <div className="mailbox-list">
              {mailboxes.map((mailbox) => {
                const domain = domains.find((d) => d.id === mailbox.domainId);
                const isExpanded = expandedConnections.has(mailbox.id);
                const mailHost = "mail.qrzmail.com";
                return (
                  <div className="mailbox-card" key={mailbox.id}>
                    <div className="mailbox-card-avatar">
                      {(mailbox.name || mailbox.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="mailbox-card-info">
                      <strong>{mailbox.email}</strong>
                      <span className="mailbox-card-name">{mailbox.name}</span>
                      <span className="mailbox-card-domain">{domain?.domain ?? "Unknown"}</span>
                    </div>
                    <div className="mailbox-card-quota">{mailbox.quotaMb} MB</div>
                    <div className="mailbox-card-actions">
                      <button className="button ghost small" disabled={state.type === "loading"} onClick={() => {
                        const next = new Set(expandedConnections);
                        if (isExpanded) next.delete(mailbox.id); else next.add(mailbox.id);
                        setExpandedConnections(next);
                      }} type="button" title="Connection Details">
                        <IconServer /> Connect
                      </button>
                      <button className="button ghost small" disabled={state.type === "loading"} onClick={() => setModal({ type: "edit-mailbox", mailbox })} type="button" title="Edit">
                        <IconEdit /> Edit
                      </button>
                      <button className="button ghost small" disabled={state.type === "loading"} onClick={() => setModal({ type: "reset-password", mailbox })} type="button" title="Reset Password">
                        <IconKey /> Password
                      </button>
                      {mailbox.recoveryEmail && (
                        <button className="button ghost small" disabled={state.type === "loading"} onClick={() => handleSendResetEmail(mailbox.id)} type="button" title="Send password reset email">
                          Send Reset
                        </button>
                      )}
                      <button className="button danger ghost small" disabled={state.type === "loading"} onClick={() => setModal({ type: "delete-mailbox", mailbox })} type="button" title="Delete">
                        <IconTrash /> Delete
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="conn-details">
                        <div className="conn-details-header">
                          <IconServer /> Connection Settings
                        </div>
                        <div className="conn-details-grid">
                          <div className="conn-detail-item">
                            <span className="conn-detail-label">Webmail</span>
                            <a className="conn-detail-value" href="https://mail.qrzmail.com/SOGo/" target="_blank" rel="noopener noreferrer">mail.qrzmail.com/SOGo/</a>
                          </div>
                          <div className="conn-detail-item">
                            <span className="conn-detail-label">IMAP Server</span>
                            <span className="conn-detail-value">{mailHost}</span>
                            <span className="conn-detail-sub">Port 993 · SSL/TLS</span>
                          </div>
                          <div className="conn-detail-item">
                            <span className="conn-detail-label">SMTP Server</span>
                            <span className="conn-detail-value">{mailHost}</span>
                            <span className="conn-detail-sub">Port 587 · STARTTLS</span>
                          </div>
                          <div className="conn-detail-item">
                            <span className="conn-detail-label">Username</span>
                            <span className="conn-detail-value mono">{mailbox.email}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ALIASES TAB ── */}
      {activeTab === "aliases" && (
        <div className="tab-content">
          {/* Aliases Header */}
          <div className="dash-card">
            <div className="add-domain-form-wrap">
              <div className="add-domain-icon"><IconForward /></div>
              <div>
                <h3>Email Aliases</h3>
                <p>Forward emails from an alias address to one or more destinations.</p>
              </div>
            </div>
            {activeDomains.length > 0 && (
              <div className="panel-footer" style={{ padding: "0 0 20px" }}>
                <button className="button primary" disabled={state.type === "loading"} onClick={() => setModal({ type: "add-alias", domainId: activeDomains[0].id })} type="button">
                  <IconPlus /> Add Alias
                </button>
              </div>
            )}
          </div>

          {/* Aliases List */}
          {aliases.length === 0 && activeDomains.length === 0 && (
            <div className="empty-state">
              <IconForward />
              <h3>No aliases yet</h3>
              <p>Activate a domain first, then create aliases.</p>
            </div>
          )}
          {aliases.length === 0 && activeDomains.length > 0 && (
            <div className="empty-state">
              <IconForward />
              <h3>No aliases yet</h3>
              <p>Click &ldquo;Add Alias&rdquo; to create your first email alias.</p>
            </div>
          )}

          {aliases.length > 0 && (
            <div className="alias-list">
              {domains.map((domain) => {
                const domainAliases = aliasesByDomain.get(domain.id) ?? [];
                if (domainAliases.length === 0) return null;
                return (
                  <div key={domain.id} className="alias-group">
                    <div className="alias-group-header">
                      <IconGlobe />
                      <strong>{domain.domain}</strong>
                      <span className="tab-count">{domainAliases.length}</span>
                    </div>
                    {domainAliases.map((alias) => (
                      <div className="alias-card" key={alias.id}>
                        <div className="alias-card-info">
                          <strong>{alias.address}</strong>
                          <span className="alias-arrow">&rarr;</span>
                          <span className="alias-goto">{alias.goto}</span>
                          {!alias.active && <span className="badge status-pending_dns">Inactive</span>}
                        </div>
                        <div className="alias-card-actions">
                          <button className="button ghost small" disabled={state.type === "loading"} onClick={() => setModal({ type: "edit-alias", alias })} type="button">
                            <IconEdit /> Edit
                          </button>
                          <button className="button danger ghost small" disabled={state.type === "loading"} onClick={() => setModal({ type: "delete-alias", alias })} type="button">
                            <IconTrash /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Edit Mailbox Modal */}
      {modal.type === "edit-mailbox" && (
        <div className="modal-overlay" onClick={() => setModal({ type: "closed" })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit mailbox</h2>
            <p className="modal-subtitle">{modal.mailbox.email}</p>
            <form onSubmit={handleEditMailbox}>
              <div className="field">
                <label htmlFor="edit-name">Display name</label>
                <input id="edit-name" name="name" defaultValue={modal.mailbox.name} required />
              </div>
              <div className="field">
                <label htmlFor="edit-quota">Quota MB</label>
                <input id="edit-quota" name="quotaMb" type="number" defaultValue={modal.mailbox.quotaMb} min={256} required />
              </div>
              <div className="field">
                <label htmlFor="edit-recovery-email">Recovery email <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>(optional)</span></label>
                <input id="edit-recovery-email" name="recoveryEmail" type="email" defaultValue={modal.mailbox.recoveryEmail ?? ""} placeholder="backup@example.com" />
                <p className="field-hint">Used to send password reset instructions if the password is forgotten.</p>
              </div>
              <div className="modal-actions">
                <button type="button" className="button" onClick={() => setModal({ type: "closed" })}>Cancel</button>
                <button type="submit" className="button primary" disabled={state.type === "loading"}>Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {modal.type === "reset-password" && (
        <div className="modal-overlay" onClick={() => setModal({ type: "closed" })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Reset password</h2>
            <p className="modal-subtitle">{modal.mailbox.email}</p>
            <form onSubmit={handleResetPassword}>
              <div className="field">
                <label htmlFor="reset-password">New password</label>
                <input id="reset-password" name="password" type="password" minLength={10} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="button" onClick={() => setModal({ type: "closed" })}>Cancel</button>
                <button type="submit" className="button primary" disabled={state.type === "loading"}>Reset password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Mailbox Confirmation */}
      {modal.type === "delete-mailbox" && (
        <div className="modal-overlay" onClick={() => setModal({ type: "closed" })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete mailbox</h2>
            <p>Are you sure you want to delete <strong>{modal.mailbox.email}</strong>? This will permanently remove the mailbox and all its emails from the mail server.</p>
            <div className="modal-actions">
              <button type="button" className="button" onClick={() => setModal({ type: "closed" })}>Cancel</button>
              <button type="button" className="button danger" disabled={state.type === "loading"} onClick={handleDeleteMailbox}>Delete permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Domain Confirmation */}
      {modal.type === "delete-domain" && (
        <div className="modal-overlay" onClick={() => setModal({ type: "closed" })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete domain</h2>
            <p>Are you sure you want to delete <strong>{modal.domain.domain}</strong>? All mailboxes under this domain must be deleted first.</p>
            <div className="modal-actions">
              <button type="button" className="button" onClick={() => setModal({ type: "closed" })}>Cancel</button>
              <button type="button" className="button danger" disabled={state.type === "loading"} onClick={handleDeleteDomain}>Delete domain</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Alias Modal */}
      {modal.type === "add-alias" && (
        <div className="modal-overlay" onClick={() => setModal({ type: "closed" })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add email alias</h2>
            <p>Forward emails from a new address to an existing mailbox.</p>
            <form onSubmit={handleAddAlias}>
              <div className="field">
                <label htmlFor="add-alias-domain">Domain</label>
                <select id="add-alias-domain" name="domainId" required defaultValue={modal.domainId}>
                  {activeDomains.map((domain) => (
                    <option key={domain.id} value={domain.id}>{domain.domain}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="add-alias-address">Alias address</label>
                <div className="input-suffix">
                  <input id="add-alias-address" name="address" placeholder="info" required />
                  <span className="suffix">@{activeDomains.find((d) => d.id === (modal.type === "add-alias" ? modal.domainId : ""))?.domain ?? "domain.com"}</span>
                </div>
                <p className="field-hint">Enter the local part only (e.g., "info"). The domain is already selected above.</p>
              </div>
              <div className="field">
                <label htmlFor="add-alias-goto">Forward to</label>
                <input id="add-alias-goto" name="goto" placeholder="destination@yourdomain.com" required />
                <p className="field-hint">Emails sent to the alias will be forwarded here.</p>
              </div>
              <div className="modal-actions">
                <button type="button" className="button" onClick={() => setModal({ type: "closed" })}>Cancel</button>
                <button type="submit" className="button primary" disabled={state.type === "loading"}>Create alias</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Alias Modal */}
      {modal.type === "edit-alias" && (
        <div className="modal-overlay" onClick={() => setModal({ type: "closed" })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit alias</h2>
            <p className="modal-subtitle">{modal.alias.address}</p>
            <form onSubmit={handleEditAlias}>
              <div className="field">
                <label htmlFor="edit-alias-goto">Forward to</label>
                <input id="edit-alias-goto" name="goto" defaultValue={modal.alias.goto} required />
              </div>
              <div className="field">
                <label htmlFor="edit-alias-active">Active</label>
                <select id="edit-alias-active" name="active" defaultValue={modal.alias.active ? "1" : "0"}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="button" onClick={() => setModal({ type: "closed" })}>Cancel</button>
                <button type="submit" className="button primary" disabled={state.type === "loading"}>Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Alias Confirmation */}
      {modal.type === "delete-alias" && (
        <div className="modal-overlay" onClick={() => setModal({ type: "closed" })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete alias</h2>
            <p>Are you sure you want to delete the alias <strong>{modal.alias.address}</strong>? Emails sent to this address will no longer be forwarded.</p>
            <div className="modal-actions">
              <button type="button" className="button" onClick={() => setModal({ type: "closed" })}>Cancel</button>
              <button type="button" className="button danger" disabled={state.type === "loading"} onClick={handleDeleteAlias}>Delete alias</button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Plan Modal */}
      {modal.type === "upgrade" && (
        <div className="modal-overlay" onClick={() => setModal({ type: "closed" })}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <h2>Upgrade Your Plan</h2>
            <p className="modal-subtitle">
              Choose a plan that fits your needs. Your request will be reviewed by an admin.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
              {/* Starter Plan Option */}
              <div
                className="panel upgrade-plan-card"
                style={{ cursor: "pointer", padding: "16px", border: "1px solid var(--panel-border)", borderRadius: "10px" }}
                onClick={() => { void handleUpgrade("starter"); }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "16px" }}>Starter</strong>
                    <div style={{ fontSize: "13px", color: "var(--ink-soft)", marginTop: "4px" }}>
                      Up to 25 mailboxes · 10 GB storage each · Priority support
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "20px", fontWeight: 700 }}>$9</span>
                    <span style={{ fontSize: "13px", color: "var(--ink-soft)" }}>/month</span>
                  </div>
                </div>
              </div>

              {/* Business Plan Option */}
              <div
                className="panel upgrade-plan-card"
                style={{ cursor: "pointer", padding: "16px", border: "1px solid var(--accent)", borderRadius: "10px", background: "rgba(59,130,246,0.05)" }}
                onClick={() => { void handleUpgrade("business"); }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "16px" }}>Business</strong>
                    <span className="badge" style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent-light)", fontSize: "11px", marginLeft: "8px" }}>Popular</span>
                    <div style={{ fontSize: "13px", color: "var(--ink-soft)", marginTop: "4px" }}>
                      Up to 100 mailboxes · 25 GB storage each · Phone & email support
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "20px", fontWeight: 700 }}>$29</span>
                    <span style={{ fontSize: "13px", color: "var(--ink-soft)" }}>/month</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <button type="button" className="button" onClick={() => setModal({ type: "closed" })}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* DKIM DNS Records Modal */}
      {modal.type === "dkim" && (
        <div className="modal-overlay" onClick={() => setModal({ type: "closed" })}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>Email Authentication DNS Records</h2>
            <p className="modal-subtitle">
              Add these DNS records at your domain provider for <strong>{modal.domain.domain}</strong>.
              This enables email authentication (SPF, DKIM, DMARC) so your emails reach inboxes instead of spam.
            </p>

            <div className="dkim-records">
              {/* MX */}
              <div className="dkim-record">
                <h3>MX Record <span className="badge badge-required">Required</span></h3>
                <p>Routes incoming emails to the mail server. Without this, no one can send emails to your domain.</p>
                <div className="dkim-record-fields">
                  <div className="field"><label>Type</label><code>{modal.dnsRecords.mx.type}</code></div>
                  <div className="field"><label>Host</label><code>{modal.dnsRecords.mx.host}</code></div>
                  <div className="field"><label>Priority</label><code>{modal.dnsRecords.mx.priority}</code></div>
                  <div className="field"><label>Value</label><code className="dkim-value">{modal.dnsRecords.mx.value}</code></div>
                </div>
              </div>

              {/* SPF */}
              <div className="dkim-record">
                <h3>SPF Record</h3>
                <p>Authorizes this mail server to send emails for your domain.</p>
                <div className="dkim-record-fields">
                  <div className="field"><label>Type</label><code>TXT</code></div>
                  <div className="field"><label>Host</label><code>{modal.dnsRecords.spf.host}</code></div>
                  <div className="field"><label>Value</label><code className="dkim-value">{modal.dnsRecords.spf.value}</code></div>
                </div>
              </div>

              {/* DKIM */}
              <div className="dkim-record">
                <h3>DKIM Record</h3>
                <p>Digitally signs outgoing emails so recipients can verify they came from your domain.</p>
                <div className="dkim-record-fields">
                  <div className="field"><label>Type</label><code>TXT</code></div>
                  <div className="field"><label>Host</label><code>{modal.dnsRecords.dkim.host}</code></div>
                  <div className="field"><label>Value</label><code className="dkim-value dkim-value-long">{modal.dnsRecords.dkim.value}</code></div>
                </div>
              </div>

              {/* DMARC */}
              <div className="dkim-record">
                <h3>DMARC Record</h3>
                <p>Tells receiving mail servers how to handle unauthenticated emails.</p>
                <div className="dkim-record-fields">
                  <div className="field"><label>Type</label><code>TXT</code></div>
                  <div className="field"><label>Host</label><code>{modal.dnsRecords.dmarc.host}</code></div>
                  <div className="field"><label>Value</label><code className="dkim-value">{modal.dnsRecords.dmarc.value}</code></div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="button primary" onClick={() => setModal({ type: "closed" })}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
