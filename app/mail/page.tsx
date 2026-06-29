"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Check,
  ChevronDown,
  ChevronLeft,
  Edit3,
  FileText,
  Folder,
  Heading1,
  Heading2,
  Highlighter,
  HelpCircle,
  Inbox,
  Italic,
  Link2,
  List,
  ListOrdered,
  Mail,
  MailOpen,
  MoreHorizontal,
  Moon,
  Palette,
  Paperclip,
  Power,
  Quote,
  RefreshCw,
  RemoveFormatting,
  Redo2,
  PenSquare,
  Save,
  Search,
  Send,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Star,
  Strikethrough,
  Sun,
  Trash2,
  Underline,
  Undo2,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Folder = {
  path: string;
  name: string;
  specialUse?: string;
  unseen?: number;
  total?: number;
};

type MessageSummary = {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string;
  seen: boolean;
  flagged: boolean;
  answered: boolean;
  preview: string;
  hasAttachments: boolean;
};

type MessageDetail = MessageSummary & {
  html: string | null;
  text: string;
  attachments: Array<{ id: number; filename: string; contentType: string; size: number }>;
};

const folderIcons: Record<string, string> = {
  "\\Inbox": "Inbox",
  "\\Sent": "Sent",
  "\\Drafts": "Drafts",
  "\\Trash": "Trash",
  "\\Junk": "Junk",
};

const folderIconComponents: Record<string, LucideIcon> = {
  "\\Inbox": Inbox,
  "\\Sent": Send,
  "\\Drafts": FileText,
  "\\Trash": Trash2,
  "\\Junk": ShieldAlert,
  "\\Archive": Archive,
};

const emptyCompose = { to: "", cc: "", bcc: "", subject: "", text: "", html: "" };
type MailView = "mail" | "contacts" | "settings" | "about";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

function displayName(value: string) {
  if (!value) return "Unknown sender";
  return value
    .split(",")[0]
    .replace(/<[^>]+>/g, "")
    .replace(/^"|"$/g, "")
    .trim() || emailFromAddress(value);
}

function initials(value: string) {
  const name = displayName(value);
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)).toUpperCase();
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.ceil(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function folderIconFor(folder: Folder) {
  return folderIconComponents[folder.specialUse ?? ""] ?? Mail;
}

function plainTextHtml(text: string) {
  return `<pre style="font:14px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;white-space:pre-wrap;color:#172033;margin:0;">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</pre>`;
}

function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => {
      const escaped = paragraph
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
      return `<p>${escaped || "<br>"}</p>`;
    })
    .join("");
}

function htmlToPlainText(html: string) {
  if (typeof document === "undefined") {
    return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  return (container.innerText || container.textContent || "").trim();
}

function emailFromAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).split(",")[0].trim();
}

function replySubject(subject: string) {
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}

function forwardSubject(subject: string) {
  return /^fwd:/i.test(subject) ? subject : `Fwd: ${subject}`;
}

function quotedMessage(message: MessageDetail) {
  return [
    "",
    "",
    `On ${new Date(message.date).toLocaleString()}, ${message.from || "sender"} wrote:`,
    ...message.text.split("\n").map((line) => `> ${line}`),
  ].join("\n");
}

export default function MailPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [account, setAccount] = useState<string | null>(null);
  const [mainUser, setMainUser] = useState<{ email: string; name: string } | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folder, setFolder] = useState("INBOX");
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [selected, setSelected] = useState<MessageDetail | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [moveTarget, setMoveTarget] = useState("");
  const [selectedUids, setSelectedUids] = useState<number[]>([]);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [activeView, setActiveView] = useState<MailView>("mail");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    try {
      const savedTheme = localStorage.getItem("qrzmail-webmail-theme");
      return savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
    } catch {
      return "dark";
    }
  });
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [composeFiles, setComposeFiles] = useState<File[]>([]);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [compose, setCompose] = useState(emptyCompose);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const composeEditorRef = useRef<HTMLDivElement>(null);

  const selectedFolder = useMemo(
    () => folders.find((entry) => entry.path === folder),
    [folders, folder],
  );
  const selectedUidSet = useMemo(() => new Set(selectedUids), [selectedUids]);
  const unreadCount = useMemo(() => messages.filter((message) => !message.seen).length, [messages]);
  const flaggedCount = useMemo(() => messages.filter((message) => message.flagged).length, [messages]);
  const contactRows = useMemo(() => {
    const contacts = new Map<string, { name: string; email: string; count: number }>();
    for (const message of messages) {
      for (const raw of [message.from, message.to]) {
        const emailAddress = emailFromAddress(raw);
        if (!emailAddress) continue;
        const key = emailAddress.toLowerCase();
        const existing = contacts.get(key);
        contacts.set(key, {
          name: existing?.name || displayName(raw),
          email: emailAddress,
          count: (existing?.count ?? 0) + 1,
        });
      }
    }
    return Array.from(contacts.values()).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 80);
  }, [messages]);
  const totalFolderCount = folders.reduce((sum, entry) => sum + (entry.total ?? 0), 0);
  const selectedIndex = useMemo(
    () => messages.findIndex((message) => message.uid === selectedUid),
    [messages, selectedUid],
  );
  const canOpenPrevious = selectedIndex > 0;
  const canOpenNext = selectedIndex !== -1 && selectedIndex < messages.length - 1;
  const draftKey = account ? `qrzmail-webmail-draft:${account}` : "";

  useEffect(() => {
    document.body.classList.add("mail-route");
    return () => {
      document.body.classList.remove("mail-route");
      document.body.classList.remove("webmail-light");
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("webmail-light", theme === "light");
    try {
      localStorage.setItem("qrzmail-webmail-theme", theme);
    } catch {
      // Theme persistence is optional.
    }
  }, [theme]);

  const showStatus = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const loadFolders = useCallback(async () => {
    const res = await fetch("/api/webmail/folders");
    if (!res.ok) throw new Error("Could not load folders.");
    const body = (await res.json()) as { folders: Folder[] };
    setFolders(body.folders);
  }, []);

  const loadMessages = useCallback(async (nextFolder: string, nextSearch = "") => {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ folder: nextFolder });
      if (nextSearch.trim()) params.set("q", nextSearch.trim());
      const res = await fetch(`/api/webmail/messages?${params.toString()}`);
      if (!res.ok) throw new Error("Could not load messages.");
      const body = (await res.json()) as { messages: MessageSummary[] };
      setMessages(body.messages);
      setSelectedUid(null);
      setSelected(null);
      setSelectedUids([]);
      if (nextSearch.trim()) showStatus(`${body.messages.length} matching messages`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load messages.");
    } finally {
      setBusy(false);
    }
  }, [showStatus]);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/webmail/me");
      if (res.ok) {
        const body = (await res.json()) as { email: string };
        setAccount(body.email);
        await loadFolders();
        await loadMessages("INBOX", "");
        return;
      }

      // No webmail session — try auto-login using the main app session
      // (which stores the mailbox password encrypted).
      const autoRes = await fetch("/api/webmail/auto-login", { method: "POST" });
      if (autoRes.ok) {
        const body = (await autoRes.json()) as { email: string };
        setAccount(body.email);
        await loadFolders();
        await loadMessages("INBOX", "");
      } else {
        setAccount(null);
      }
    } finally {
      setLoading(false);
    }
  }, [loadFolders, loadMessages]);

  useEffect(() => {
    // Fetch main app user for display and pre-fill email
    fetch("/api/account/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (data?.user?.email) {
          setMainUser({ email: data.user.email, name: data.user.name || "" });
          setEmail(data.user.email);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSession();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSession]);

  useEffect(() => {
    if (!draftKey) return;

    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(draftKey);
        if (!saved) return;
        const parsed = JSON.parse(saved) as Partial<typeof emptyCompose>;
        setCompose((value) => ({ ...value, ...parsed }));
        setShowCcBcc(Boolean(parsed.cc || parsed.bcc));
      } catch {
        // Ignore invalid drafts.
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;

    const timer = window.setTimeout(() => {
      try {
        const hasDraft = Object.values(compose).some((value) => value.trim());
        if (hasDraft) {
          localStorage.setItem(draftKey, JSON.stringify(compose));
        } else {
          localStorage.removeItem(draftKey);
        }
      } catch {
        // Draft persistence is a convenience only.
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [compose, draftKey]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditing = target?.closest("input, textarea, select, [contenteditable='true']");
      if (isEditing) return;

      if (event.key === "c") {
        event.preventDefault();
        startCompose();
      } else if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key === "ArrowDown" && selectedIndex < messages.length - 1) {
        event.preventDefault();
        void openMessage(messages[selectedIndex + 1]);
      } else if (event.key === "ArrowUp" && selectedIndex > 0) {
        event.preventDefault();
        void openMessage(messages[selectedIndex - 1]);
      } else if (event.key === "Escape" && selected) {
        setSelected(null);
        setSelectedUid(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    if (!composeOpen || !composeEditorRef.current) return;
    const nextHtml = compose.html || (compose.text ? textToHtml(compose.text) : "");
    if (composeEditorRef.current.innerHTML !== nextHtml) {
      composeEditorRef.current.innerHTML = nextHtml;
    }
  }, [compose.html, compose.text, composeOpen]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/webmail/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error ?? "Login failed.");
      // Store CSRF token for domain management / marketing API requests
      if ((body as { csrfToken?: string }).csrfToken) {
        sessionStorage.setItem("csrfToken", (body as { csrfToken: string }).csrfToken);
      }
      setPassword("");
      setAccount((body as { email: string }).email);
      await loadFolders();
      await loadMessages("INBOX", "");
      showStatus("Signed in");
      // Notify the navbar (NavUser) to re-fetch auth state so it shows
      // the correct links (e.g. /domains instead of /domains/login)
      window.dispatchEvent(new CustomEvent("qrzmail-auth-change"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/webmail/logout", { method: "POST" });
    setAccount(null);
    setFolders([]);
    setMessages([]);
    setSelected(null);
    setSelectedUid(null);
    setSearch("");
    setSelectedUids([]);
    setCompose(emptyCompose);
    setComposeFiles([]);
    setComposeOpen(false);
  }

  async function openFolder(path: string) {
    setActiveView("mail");
    setFolder(path);
    setSearch("");
    await loadMessages(path, "");
  }

  async function openMessage(message: MessageSummary) {
    setActiveView("mail");
    setSelectedUid(message.uid);
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/webmail/messages/${message.uid}?folder=${encodeURIComponent(folder)}`,
      );
      if (!res.ok) throw new Error("Could not load message.");
      const body = (await res.json()) as { message: MessageDetail };
      setSelected(body.message);
      setMessages((entries) =>
        entries.map((entry) => (entry.uid === message.uid ? { ...entry, seen: true } : entry)),
      );
      setSelectedUids((entries) => entries.filter((uid) => uid !== message.uid));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load message.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    if (!selectedUid) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/webmail/messages/${selectedUid}?folder=${encodeURIComponent(folder)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Could not delete message.");
      setMessages((entries) => entries.filter((entry) => entry.uid !== selectedUid));
      setSelected(null);
      setSelectedUid(null);
      setSelectedUids([]);
      showStatus("Message deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete message.");
    } finally {
      setBusy(false);
    }
  }

  async function patchSelected(action: "read" | "unread" | "flag" | "unflag" | "move", destination?: string) {
    if (!selectedUid) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/webmail/messages/${selectedUid}?folder=${encodeURIComponent(folder)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, destination }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error ?? "Could not update message.");

      if (action === "move") {
        setMessages((entries) => entries.filter((entry) => entry.uid !== selectedUid));
        setSelected(null);
        setSelectedUid(null);
        setMoveTarget("");
        await loadFolders();
        showStatus("Message moved");
        return;
      }

      setSelected((value) =>
        value
          ? {
              ...value,
              seen: action === "read" ? true : action === "unread" ? false : value.seen,
              flagged: action === "flag" ? true : action === "unflag" ? false : value.flagged,
            }
          : value,
      );
      setMessages((entries) =>
        entries.map((entry) =>
          entry.uid === selectedUid
            ? {
                ...entry,
                seen: action === "read" ? true : action === "unread" ? false : entry.seen,
                flagged: action === "flag" ? true : action === "unflag" ? false : entry.flagged,
              }
            : entry,
        ),
      );
      await loadFolders();
      showStatus("Message updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update message.");
    } finally {
      setBusy(false);
    }
  }

  async function patchMessage(
    uid: number,
    action: "read" | "unread" | "flag" | "unflag" | "move",
    destination?: string,
  ) {
    const res = await fetch(
      `/api/webmail/messages/${uid}?folder=${encodeURIComponent(folder)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, destination }),
      },
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body as { error?: string }).error ?? "Could not update message.");
  }

  async function deleteMessageByUid(uid: number) {
    const res = await fetch(
      `/api/webmail/messages/${uid}?folder=${encodeURIComponent(folder)}`,
      { method: "DELETE" },
    );
    if (!res.ok) throw new Error("Could not delete message.");
  }

  async function runBulk(action: "read" | "unread" | "flag" | "unflag" | "move" | "delete", destination?: string) {
    const targets = selectedUids.length ? selectedUids : selectedUid ? [selectedUid] : [];
    if (!targets.length) return;

    setBusy(true);
    setError("");
    try {
      for (const uid of targets) {
        if (action === "delete") {
          await deleteMessageByUid(uid);
        } else {
          await patchMessage(uid, action, destination);
        }
      }

      if (action === "move" || action === "delete") {
        setMessages((entries) => entries.filter((entry) => !targets.includes(entry.uid)));
        if (selectedUid && targets.includes(selectedUid)) {
          setSelected(null);
          setSelectedUid(null);
        }
        setMoveTarget("");
        showStatus(action === "delete" ? "Messages deleted" : "Messages moved");
      } else {
        setMessages((entries) =>
          entries.map((entry) =>
            targets.includes(entry.uid)
              ? {
                  ...entry,
                  seen: action === "read" ? true : action === "unread" ? false : entry.seen,
                  flagged: action === "flag" ? true : action === "unflag" ? false : entry.flagged,
                }
              : entry,
          ),
        );
        showStatus("Messages updated");
      }

      setSelectedUids([]);
      await loadFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed.");
    } finally {
      setBusy(false);
    }
  }

  function toggleSelectedUid(uid: number) {
    setSelectedUids((entries) =>
      entries.includes(uid) ? entries.filter((entry) => entry !== uid) : [...entries, uid],
    );
  }

  function toggleSelectAll() {
    setSelectedUids((entries) =>
      entries.length === messages.length ? [] : messages.map((message) => message.uid),
    );
  }

  function startCompose(kind: "new" | "reply" | "replyAll" | "forward" = "new") {
    if (!selected || kind === "new") {
      setCompose(kind === "new" ? emptyCompose : compose);
      setComposeFiles([]);
      setComposeOpen(true);
      window.setTimeout(() => composeEditorRef.current?.focus(), 50);
      return;
    }

    if (kind === "forward") {
      const text = [
        "",
        "",
        "---------- Forwarded message ---------",
        `From: ${selected.from}`,
        `Date: ${new Date(selected.date).toLocaleString()}`,
        `Subject: ${selected.subject}`,
        `To: ${selected.to}`,
        "",
        selected.text,
      ].join("\n");
      setCompose({
        to: "",
        cc: "",
        bcc: "",
        subject: forwardSubject(selected.subject),
        text,
        html: textToHtml(text),
      });
    } else {
      const from = emailFromAddress(selected.from);
      const replyAllCc = kind === "replyAll" ? selected.to.replace(account ?? "", "").replace(/^,\s*|\s*,\s*$/g, "") : "";
      const text = quotedMessage(selected);
      setCompose({
        to: from,
        cc: replyAllCc,
        bcc: "",
        subject: replySubject(selected.subject),
        text,
        html: textToHtml(text),
      });
    }

    setShowCcBcc(kind === "replyAll");
    setComposeOpen(true);
    window.setTimeout(() => composeEditorRef.current?.focus(), 50);
  }

  function closeCompose() {
    setComposeOpen(false);
    setComposeFiles([]);
  }

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    setActiveView("mail");
    setOptionsOpen(false);
    setMoreOpen(false);
    await loadMessages(folder, search);
  }

  async function sendMail(event: FormEvent) {
    event.preventDefault();
    const editorHtml = composeEditorRef.current?.innerHTML ?? compose.html;
    const editorText = htmlToPlainText(editorHtml || compose.text);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/webmail/send", {
        method: "POST",
        body: (() => {
          const form = new FormData();
          form.set("to", compose.to);
          form.set("cc", compose.cc);
          form.set("bcc", compose.bcc);
          form.set("subject", compose.subject);
          form.set("text", editorText);
          form.set("html", editorHtml);
          composeFiles.forEach((file) => form.append("attachments", file));
          return form;
        })(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error ?? "Could not send message.");
      setCompose(emptyCompose);
      setComposeFiles([]);
      setComposeOpen(false);
      setShowCcBcc(false);
      if (draftKey) localStorage.removeItem(draftKey);
      if (selectedFolder?.specialUse === "\\Sent") await loadMessages(folder, search);
      showStatus("Message sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  function updateComposeEditor() {
    const html = composeEditorRef.current?.innerHTML ?? "";
    setCompose((value) => ({ ...value, html, text: htmlToPlainText(html) }));
  }

  function runEditorCommand(command: string, value?: string) {
    composeEditorRef.current?.focus();
    document.execCommand(command, false, value);
    updateComposeEditor();
  }

  function setEditorBlock(tag: string) {
    runEditorCommand("formatBlock", tag);
  }

  function addEditorLink() {
    const url = window.prompt("Paste link URL");
    if (!url) return;
    runEditorCommand("createLink", url);
  }

  function clearComposeFormatting() {
    runEditorCommand("removeFormat");
    runEditorCommand("unlink");
  }

  function insertSignature() {
    runEditorCommand("insertHTML", `<p><br></p><p>Regards,<br>${account ?? "QRZMail"}</p>`);
    showStatus("Signature inserted");
  }

  function insertQuickResponse() {
    runEditorCommand(
      "insertHTML",
      "<p>Thank you for your message. I have received it and will get back to you shortly.</p>",
    );
    showStatus("Response inserted");
  }

  function openView(view: MailView) {
    setActiveView(view);
    setOptionsOpen(false);
    setMoreOpen(false);
    if (view === "mail") showStatus("Mail view");
  }

  if (loading) {
    return (
      <div className="mail-shell mail-loading">
        <div className="mail-loading-card">
          <span className="mail-spinner" />
          <strong>Loading webmail...</strong>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="mail-auth">
        <form className="mail-login-card" onSubmit={handleLogin}>
          <div className="mail-brand-panel login">
            <div className="mail-brand-mark">Q</div>
            <div>
              <strong>QRZMail</strong>
              <span>Account</span>
            </div>
          </div>
          <div>
            <p className="mail-kicker">Unified access</p>
            <h1>Sign in to your account</h1>
            {mainUser ? (
              <p>Welcome, <strong>{mainUser.name || mainUser.email}</strong>. Enter your password to access mail, domains, and marketing.</p>
            ) : (
              <p>Access your email, manage domains, and run marketing campaigns.</p>
            )}
          </div>
          {error && <div className="mail-error">{error}</div>}
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@qrzmail.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your mailbox password"
              required
            />
          </label>
          <button className="mail-primary" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
          <Link href="/forgot-password" className="mail-forgot-link">
            Forgot password?
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className={`mail-shell ${composeOpen ? "composing" : ""}`}>
      <aside className="mail-sidebar">
        <div className="mail-brand-panel">
          <div className="mail-brand-mark">Q</div>
          <div>
            <strong>QRZMail</strong>
            <span>Webmail</span>
          </div>
        </div>
        <div className="mail-account">
          <span>Signed in</span>
          <strong>{account}</strong>
        </div>
        <div className="mail-folder-heading">Mailboxes</div>
        <nav className="mail-folders">
          {folders.map((entry) => {
            const FolderIcon = folderIconFor(entry);
            return (
            <button
              key={entry.path}
              className={entry.path === folder ? "active" : ""}
              onClick={() => openFolder(entry.path)}
              type="button"
            >
              <i aria-hidden="true"><FolderIcon size={15} /></i>
              <span>
                <b>{folderIcons[entry.specialUse ?? ""] ?? entry.name}</b>
                <em>{entry.path}</em>
              </span>
              <small>{entry.unseen ? entry.unseen : entry.total ?? 0}</small>
            </button>
            );
          })}
        </nav>
        <div className="mail-sidebar-footer">
          <div>
            <span>Total mail</span>
            <strong>{totalFolderCount}</strong>
          </div>
        </div>
      </aside>

      <section className="mail-list-panel">
        <div className="mail-appbar">
          <div>
            <span className="mail-eyebrow">Folder</span>
            <h1>{selectedFolder?.name ?? folder}</h1>
          </div>
          <div className="mail-appbar-stats">
            <span>{messages.length} shown</span>
            <span>{unreadCount} unread</span>
            <span>{flaggedCount} flagged</span>
          </div>
        </div>
        {busy && <div className="mail-progress" aria-hidden="true" />}
        <header className="mail-toolbar">
          <div className="mail-selection">
            <label>
              <input
                type="checkbox"
                checked={messages.length > 0 && selectedUids.length === messages.length}
                onChange={toggleSelectAll}
              />
              <span>{selectedUids.length ? `${selectedUids.length} selected` : ""}</span>
            </label>
          </div>
          <div className="mail-toolbar-actions" aria-label="Message actions">
            <button type="button" onClick={() => startCompose("new")} disabled={busy} title="New message">
              <PenSquare size={15} aria-hidden="true" />
            </button>
            <span className="mail-toolbar-divider" aria-hidden="true" />
            <button type="button" onClick={() => runBulk("read")} disabled={busy || (!selectedUids.length && !selectedUid)} title="Mark as read">
              <MailOpen size={15} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => runBulk("unread")} disabled={busy || (!selectedUids.length && !selectedUid)} title="Mark as unread">
              <Mail size={15} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => runBulk("flag")} disabled={busy || (!selectedUids.length && !selectedUid)} title="Toggle flag">
              <Star size={15} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => runBulk("delete")} disabled={busy || (!selectedUids.length && !selectedUid)} title="Delete">
              <Trash2 size={15} aria-hidden="true" />
            </button>
            <span className="mail-toolbar-divider" aria-hidden="true" />
            <select value={moveTarget} onChange={(event) => setMoveTarget(event.target.value)} disabled={busy}>
              <option value="">Move to...</option>
              {folders
                .filter((entry) => entry.path !== folder)
                .map((entry) => (
                  <option value={entry.path} key={entry.path}>
                    {entry.name}
                  </option>
                ))}
            </select>
            <button type="button" onClick={() => moveTarget && runBulk("move", moveTarget)} disabled={busy || !moveTarget} title="Move">
              <Folder size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="mail-toolbar-tools">
            <form className="mail-search" onSubmit={runSearch}>
              <input
                ref={searchInputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search mail"
              />
              <button type="submit" disabled={busy} title="Search">
                <Search size={15} aria-hidden="true" />
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    void loadMessages(folder, "");
                  }}
                  disabled={busy}
                  title="Clear search"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </form>
            <span className="mail-toolbar-divider" aria-hidden="true" />
            <button
              type="button"
              onClick={() => {
                setOptionsOpen((value) => !value);
                setMoreOpen(false);
              }}
              title="View options"
            >
              <SlidersHorizontal size={15} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => loadMessages(folder, search)} disabled={busy} title="Refresh">
              <RefreshCw size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMoreOpen((value) => !value);
                setOptionsOpen(false);
              }}
              title="More actions"
            >
              <MoreHorizontal size={15} aria-hidden="true" />
            </button>
          </div>
        </header>
        {(optionsOpen || moreOpen) && (
          <div className="mail-action-popover">
            {optionsOpen ? (
              <>
                <div>
                  <strong>Message list</strong>
                  <span>{messages.length} visible, {unreadCount} unread, {flaggedCount} flagged</span>
                </div>
                <button type="button" onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}>
                  <SlidersHorizontal size={15} aria-hidden="true" />
                  {density === "compact" ? "Comfortable rows" : "Compact rows"}
                </button>
                <button type="button" onClick={toggleSelectAll} disabled={messages.length === 0}>
                  <Check size={15} aria-hidden="true" />
                  {selectedUids.length === messages.length ? "Clear selection" : "Select all messages"}
                </button>
                <button type="button" onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}>
                  {theme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
                  {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                </button>
              </>
            ) : (
              <>
                <div>
                  <strong>Quick actions</strong>
                  <span>{selectedUids.length || selectedUid ? `${selectedUids.length || 1} selected` : "Select a message first"}</span>
                </div>
                <button type="button" onClick={() => runBulk("read")} disabled={busy || (!selectedUids.length && !selectedUid)}>
                  <MailOpen size={15} aria-hidden="true" /> Mark read
                </button>
                <button type="button" onClick={() => runBulk("unread")} disabled={busy || (!selectedUids.length && !selectedUid)}>
                  <Mail size={15} aria-hidden="true" /> Mark unread
                </button>
                <button type="button" onClick={() => runBulk("flag")} disabled={busy || (!selectedUids.length && !selectedUid)}>
                  <Star size={15} aria-hidden="true" /> Flag
                </button>
                <button type="button" onClick={() => runBulk("delete")} disabled={busy || (!selectedUids.length && !selectedUid)}>
                  <Trash2 size={15} aria-hidden="true" /> Delete
                </button>
                <label>
                  Move to
                  <select value={moveTarget} onChange={(event) => setMoveTarget(event.target.value)} disabled={busy}>
                    <option value="">Choose folder</option>
                    {folders
                      .filter((entry) => entry.path !== folder)
                      .map((entry) => (
                        <option value={entry.path} key={entry.path}>
                          {entry.name}
                        </option>
                      ))}
                  </select>
                </label>
                <button type="button" onClick={() => moveTarget && runBulk("move", moveTarget)} disabled={busy || !moveTarget}>
                  <Folder size={15} aria-hidden="true" /> Move selected
                </button>
              </>
            )}
          </div>
        )}
        {error && <div className="mail-error">{error}</div>}
        <div className={`mail-message-list ${density === "compact" ? "compact" : ""}`}>
          {messages.map((message) => (
            <button
              key={message.uid}
              className={`mail-message-row ${selectedUid === message.uid ? "active" : ""} ${
                !message.seen ? "unread" : ""
              }`}
              onClick={() => openMessage(message)}
              type="button"
            >
              <span className="mail-row-check" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedUidSet.has(message.uid)}
                  onChange={() => toggleSelectedUid(message.uid)}
                />
              </span>
              <span className="mail-row-status" aria-hidden="true">
                {!message.seen ? <Mail size={12} /> : message.flagged ? <Star size={12} /> : <Check size={12} />}
              </span>
              <span className="mail-row-avatar" aria-hidden="true">{initials(message.from)}</span>
              <span className="mail-row-from">{displayName(message.from)}</span>
              <span className="mail-row-date" title={formatDate(message.date)}>{formatRelativeDate(message.date)}</span>
              <strong>{message.subject}</strong>
              <span className="mail-row-preview">
                {message.flagged ? "Starred · " : ""}
                {message.hasAttachments ? "Attachment · " : ""}
                {message.preview}
              </span>
            </button>
          ))}
          {messages.length === 0 && (
            <div className="mail-empty">
              <strong>{search ? "No matching messages" : "No messages in this folder"}</strong>
              <span>{search ? "Clear the search or try a broader term." : "New mail will appear here automatically after refresh."}</span>
            </div>
          )}
        </div>
      </section>

      <section className={`mail-reader ${selected ? "open" : ""}`}>
        {selected ? (
          <>
            <header className="mail-reader-header">
              <div>
                <span className="mail-eyebrow">{formatDate(selected.date)}</span>
                <h2>{selected.subject}</h2>
                <div className="mail-address-line">
                  <span>From</span>
                  <strong>{displayName(selected.from)}</strong>
                  <em>{emailFromAddress(selected.from)}</em>
                </div>
                <div className="mail-address-line">
                  <span>To</span>
                  <strong>{selected.to || account}</strong>
                </div>
              </div>
              <div className="mail-reader-actions">
                <button type="button" className="mail-mobile-only" onClick={() => setSelected(null)} disabled={busy} title="Back">
                  <ChevronLeft size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => canOpenPrevious && openMessage(messages[selectedIndex - 1])} disabled={busy || !canOpenPrevious} title="Previous message">
                  <ArrowUp size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => canOpenNext && openMessage(messages[selectedIndex + 1])} disabled={busy || !canOpenNext} title="Next message">
                  <ArrowDown size={15} aria-hidden="true" />
                </button>
                <span className="mail-toolbar-divider" aria-hidden="true" />
                <button type="button" onClick={() => startCompose("reply")} disabled={busy} title="Reply"><MailOpen size={15} aria-hidden="true" /></button>
                <button type="button" onClick={() => startCompose("replyAll")} disabled={busy} title="Reply all"><MailOpen size={15} aria-hidden="true" /></button>
                <button type="button" onClick={() => startCompose("forward")} disabled={busy} title="Forward"><Send size={15} aria-hidden="true" /></button>
                <span className="mail-toolbar-divider" aria-hidden="true" />
                <button type="button" onClick={() => patchSelected(selected.seen ? "unread" : "read")} disabled={busy} title={selected.seen ? "Mark unread" : "Mark read"}>
                  {selected.seen ? <Mail size={15} aria-hidden="true" /> : <MailOpen size={15} aria-hidden="true" />}
                </button>
                <button type="button" onClick={() => patchSelected(selected.flagged ? "unflag" : "flag")} disabled={busy} title={selected.flagged ? "Unflag" : "Flag"}>
                  <Star size={15} aria-hidden="true" />
                </button>
                <select value={moveTarget} onChange={(event) => setMoveTarget(event.target.value)} disabled={busy}>
                  <option value="">Move to...</option>
                  {folders
                    .filter((entry) => entry.path !== folder)
                    .map((entry) => (
                      <option value={entry.path} key={entry.path}>
                        {entry.name}
                      </option>
                    ))}
                </select>
                <button type="button" onClick={() => moveTarget && patchSelected("move", moveTarget)} disabled={busy || !moveTarget} title="Move">
                  <Folder size={15} aria-hidden="true" />
                </button>
                <button type="button" className="mail-danger" onClick={deleteSelected} disabled={busy} title="Delete">
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </header>
            {selected.attachments.length > 0 && (
              <div className="mail-attachments">
                {selected.attachments.map((attachment) => (
                  <a
                    href={`/api/webmail/messages/${selected.uid}/attachments/${attachment.id}?folder=${encodeURIComponent(folder)}`}
                    key={`${attachment.filename}-${attachment.size}`}
                  >
                    <Paperclip size={13} aria-hidden="true" /> {attachment.filename} ({formatBytes(attachment.size)})
                  </a>
                ))}
              </div>
            )}
            <iframe
              className="mail-body-frame"
              sandbox=""
              title="Message body"
              srcDoc={selected.html || plainTextHtml(selected.text)}
            />
          </>
        ) : (
          <div className="mail-reader-empty">
            <strong>Select a message</strong>
            <span>Message content, attachments, and reply actions will appear here.</span>
          </div>
        )}
      </section>

      {activeView !== "mail" && (
        <section className="mail-utility-panel">
          {activeView === "contacts" && (
            <>
              <header>
                <span className="mail-eyebrow">Address intelligence</span>
                <h2>Contacts</h2>
                <p>People found in the currently loaded mailbox.</p>
              </header>
              <div className="mail-contact-grid">
                {contactRows.map((contact) => (
                  <button
                    type="button"
                    key={contact.email}
                    onClick={() => {
                      setCompose({ ...emptyCompose, to: contact.email });
                      setComposeFiles([]);
                      setComposeOpen(true);
                      window.setTimeout(() => composeEditorRef.current?.focus(), 50);
                    }}
                  >
                    <span>{initials(contact.name || contact.email)}</span>
                    <strong>{contact.name || contact.email}</strong>
                    <em>{contact.email}</em>
                    <small>{contact.count} messages</small>
                  </button>
                ))}
                {contactRows.length === 0 && <div className="mail-empty">No contacts found in this folder.</div>}
              </div>
            </>
          )}

          {activeView === "settings" && (
            <>
              <header>
                <span className="mail-eyebrow">Personalize webmail</span>
                <h2>Settings</h2>
                <p>Interface preferences are saved in this browser.</p>
              </header>
              <div className="mail-settings-grid">
                <label>
                  Theme
                  <select value={theme} onChange={(event) => setTheme(event.target.value as "dark" | "light")}>
                    <option value="dark">Dark futuristic</option>
                    <option value="light">Light mode</option>
                  </select>
                </label>
                <label>
                  Message density
                  <select value={density} onChange={(event) => setDensity(event.target.value as "comfortable" | "compact")}>
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </label>
                <button type="button" onClick={() => loadMessages(folder, search)} disabled={busy}>
                  <RefreshCw size={16} aria-hidden="true" /> Refresh current folder
                </button>
                <button type="button" onClick={() => setShowCcBcc((value) => !value)}>
                  <Edit3 size={16} aria-hidden="true" /> {showCcBcc ? "Hide Cc/Bcc by default" : "Show Cc/Bcc in compose"}
                </button>
              </div>
            </>
          )}

          {activeView === "about" && (
            <>
              <header>
                <span className="mail-eyebrow">QRZMail webmail</span>
                <h2>Advanced mail workspace</h2>
                <p>Keyboard shortcuts: C to compose, / to search, arrow keys to move between messages.</p>
              </header>
              <div className="mail-status-grid">
                <div><strong>{folders.length}</strong><span>Folders</span></div>
                <div><strong>{messages.length}</strong><span>Messages loaded</span></div>
                <div><strong>{unreadCount}</strong><span>Unread</span></div>
                <div><strong>{flaggedCount}</strong><span>Flagged</span></div>
              </div>
            </>
          )}
        </section>
      )}

      {composeOpen && (
        <div className="mail-compose-overlay" onClick={() => !busy && closeCompose()}>
          <form className="mail-compose" onSubmit={sendMail} onClick={(event) => event.stopPropagation()}>
            <header>
              <div className="mail-compose-top-actions">
                <button type="button" onClick={() => showStatus("Draft saved")} disabled={busy}>
                  <Save size={18} aria-hidden="true" /> Save
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById("mail-compose-attachments")?.click()}
                  disabled={busy}
                >
                  <Paperclip size={18} aria-hidden="true" /> Attach
                </button>
                <button type="button" onClick={insertSignature} disabled={busy}>
                  <Edit3 size={18} aria-hidden="true" /> Signature
                </button>
                <button type="button" onClick={insertQuickResponse} disabled={busy}>
                  <MailOpen size={18} aria-hidden="true" /> Responses
                </button>
              </div>
              <div className="mail-compose-title">Options and attachments</div>
              <button type="button" onClick={closeCompose} disabled={busy} title="Close compose">
                <X size={16} aria-hidden="true" /> Close
              </button>
            </header>
            <label className="mail-compose-from">
              <span>From</span>
              <input value={account} readOnly />
            </label>
            <div className="mail-compose-line">
              <span>To</span>
              <input
                value={compose.to}
                onChange={(event) => setCompose((value) => ({ ...value, to: event.target.value }))}
                placeholder="To"
                required
              />
              <button type="button" onClick={() => setShowCcBcc((value) => !value)}>
                Cc/Bcc <ChevronDown size={14} aria-hidden="true" />
              </button>
            </div>
            {showCcBcc && (
              <div className="mail-compose-grid">
                <input
                  value={compose.cc}
                  onChange={(event) => setCompose((value) => ({ ...value, cc: event.target.value }))}
                  placeholder="Cc"
                />
                <input
                  value={compose.bcc}
                  onChange={(event) => setCompose((value) => ({ ...value, bcc: event.target.value }))}
                  placeholder="Bcc"
                />
              </div>
            )}
            <input
              className="mail-compose-subject"
              value={compose.subject}
              onChange={(event) => setCompose((value) => ({ ...value, subject: event.target.value }))}
              placeholder="Subject"
            />
            <div className="mail-editor">
              <div className="mail-editor-toolbar" aria-label="Message formatting">
                <button type="button" onClick={() => runEditorCommand("undo")} title="Undo">
                  <Undo2 size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => runEditorCommand("redo")} title="Redo">
                  <Redo2 size={15} aria-hidden="true" />
                </button>
                <span aria-hidden="true" />
                <button type="button" onClick={() => setEditorBlock("h1")} title="Heading 1">
                  <Heading1 size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setEditorBlock("h2")} title="Heading 2">
                  <Heading2 size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setEditorBlock("p")} title="Paragraph">
                  <FileText size={15} aria-hidden="true" />
                </button>
                <select defaultValue="Verdana" onChange={(event) => runEditorCommand("fontName", event.target.value)} title="Font family">
                  <option value="Verdana">Verdana</option>
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Tahoma">Tahoma</option>
                  <option value="Courier New">Mono</option>
                </select>
                <select defaultValue="3" onChange={(event) => runEditorCommand("fontSize", event.target.value)} title="Font size">
                  <option value="2">10pt</option>
                  <option value="3">12pt</option>
                  <option value="4">14pt</option>
                  <option value="5">18pt</option>
                  <option value="6">24pt</option>
                </select>
                <span aria-hidden="true" />
                <button type="button" onClick={() => runEditorCommand("bold")} title="Bold">
                  <Bold size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => runEditorCommand("italic")} title="Italic">
                  <Italic size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => runEditorCommand("underline")} title="Underline">
                  <Underline size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => runEditorCommand("strikeThrough")} title="Strikethrough">
                  <Strikethrough size={15} aria-hidden="true" />
                </button>
                <label title="Text color">
                  <Palette size={15} aria-hidden="true" />
                  <input type="color" onChange={(event) => runEditorCommand("foreColor", event.target.value)} />
                </label>
                <label title="Highlight color">
                  <Highlighter size={15} aria-hidden="true" />
                  <input type="color" onChange={(event) => runEditorCommand("hiliteColor", event.target.value)} />
                </label>
                <span aria-hidden="true" />
                <button type="button" onClick={() => runEditorCommand("justifyLeft")} title="Align left">
                  <AlignLeft size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => runEditorCommand("justifyCenter")} title="Align center">
                  <AlignCenter size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => runEditorCommand("justifyRight")} title="Align right">
                  <AlignRight size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => runEditorCommand("insertUnorderedList")} title="Bulleted list">
                  <List size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => runEditorCommand("insertOrderedList")} title="Numbered list">
                  <ListOrdered size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => runEditorCommand("formatBlock", "blockquote")} title="Quote">
                  <Quote size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={addEditorLink} title="Insert link">
                  <Link2 size={15} aria-hidden="true" />
                </button>
                <button type="button" onClick={clearComposeFormatting} title="Clear formatting">
                  <RemoveFormatting size={15} aria-hidden="true" />
                </button>
              </div>
              <div
                ref={composeEditorRef}
                className="mail-editor-body"
                contentEditable
                data-placeholder="Write your message"
                onInput={updateComposeEditor}
                onBlur={updateComposeEditor}
                suppressContentEditableWarning
                role="textbox"
                aria-label="Message body"
              />
            </div>
            <div className="mail-compose-tools">
              <strong>Options and attachments</strong>
              <label>
                <span>Maximum allowed file size is 32 MB</span>
                <input
                  id="mail-compose-attachments"
                  type="file"
                  multiple
                  onChange={(event) => setComposeFiles(Array.from(event.target.files ?? []))}
                />
                <span className="mail-attach-drop"><Paperclip size={20} aria-hidden="true" /> Attach a file</span>
              </label>
              {composeFiles.length > 0 && (
                <div className="mail-compose-files">
                  {composeFiles.map((file) => (
                    <span key={`${file.name}-${file.size}`}>{file.name}</span>
                  ))}
                </div>
              )}
              <div className="mail-compose-option">
                <span>Return receipt</span>
                <input type="checkbox" />
              </div>
              <div className="mail-compose-option">
                <span>Delivery status notification</span>
                <input type="checkbox" />
              </div>
              <div className="mail-compose-option">
                <span>Keep formatting</span>
                <input type="checkbox" defaultChecked />
              </div>
              <label className="mail-compose-select">
                Priority
                <select defaultValue="Normal">
                  <option>Normal</option>
                  <option>High</option>
                  <option>Low</option>
                </select>
              </label>
              <label className="mail-compose-select">
                Save sent message in
                <select defaultValue="Sent">
                  <option>Sent</option>
                  <option>Drafts</option>
                </select>
              </label>
            </div>
            <footer>
              <span>
                {composeFiles.length} attachments
                {Object.values(compose).some((value) => value.trim()) ? " · draft saved" : ""}
              </span>
              <button className="mail-primary" disabled={busy}>
                <Send size={15} aria-hidden="true" /> {busy ? "Sending..." : "Send"}
              </button>
            </footer>
          </form>
        </div>
      )}
      {toast && <div className="mail-toast" role="status">{toast}</div>}
    </div>
  );
}
