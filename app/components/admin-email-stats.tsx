"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";

// ── Types ────────────────────────────────────────────────

type RangeKey = "today" | "week" | "month" | "custom";

type DailyStat = {
  day: string;
  sent: number;
  received: number;
  total: number;
  sentSize: number;
  receivedSize: number;
  logins: number;
};

type MailboxStat = {
  email: string;
  storedMessages: number;
  storedBytes: number;
};

type StatsResponse = {
  range: RangeKey;
  from: string;
  to: string;
  summary: {
    totalSent: number;
    totalReceived: number;
    totalSize: number;
    sentSize: number;
    receivedSize: number;
    totalStoredMessages: number;
    totalStoredBytes: number;
    activeMailboxes: number;
    totalMailboxes: number;
    totalLogins: number;
  };
  daily: DailyStat[];
  mailboxes: MailboxStat[];
};

// ── Helpers ──────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDay(day: string, range: RangeKey) {
  const d = new Date(day + "T00:00:00");
  if (range === "today") {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  if (range === "week") {
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Custom Tooltip ───────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload || !label) return null;
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--panel-border)",
        borderRadius: 10,
        padding: "12px 16px",
        fontSize: 13,
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--ink)" }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, display: "inline-block" }} />
          <span style={{ color: "var(--ink-soft)" }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ── Component ────────────────────────────────────────────

export default function AdminEmailStats() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<RangeKey>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showMailboxes, setShowMailboxes] = useState(false);

  const fetchStats = useCallback(
    async (r: RangeKey, from?: string, to?: string) => {
      setLoading(true);
      setError("");
      try {
        let url = `/api/admin/stats?range=${r}`;
        if (r === "custom" && from && to) {
          url += `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        }
        const res = await fetch(url);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as StatsResponse;
        setStats(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (range === "custom") {
      if (customFrom && customTo) {
        fetchStats(range, customFrom, customTo);
      }
    } else {
      fetchStats(range);
    }
  }, [range, customFrom, customTo, fetchStats]);

  function handleRangeChange(r: RangeKey) {
    setRange(r);
    if (r !== "custom") {
      setCustomFrom("");
      setCustomTo("");
    }
  }

  function handleCustomApply() {
    if (customFrom && customTo) {
      fetchStats("custom", customFrom, customTo);
    }
  }

  // ── Render ─────────────────────────────────────────────

  const ranges: { key: RangeKey; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "18px 22px",
          borderBottom: "1px solid var(--line)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>📊 Email Traffic</h2>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "2px 0 0" }}>
            Live sent & received volume
          </p>
        </div>

        {/* Range selector */}
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          {ranges.map((r) => (
            <button
              key={r.key}
              className={`button small ghost ${range === r.key ? "" : ""}`}
              onClick={() => handleRangeChange(r.key)}
              style={{
                background: range === r.key ? "var(--accent)" : "var(--panel)",
                color: range === r.key ? "white" : "var(--ink-soft)",
                border: range === r.key ? "1px solid transparent" : "1px solid var(--panel-border)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {r.label}
            </button>
          ))}

          {range === "custom" && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 4 }}>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ width: 140, minHeight: 32, fontSize: 12, padding: "0 8px" }}
              />
              <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ width: 140, minHeight: 32, fontSize: 12, padding: "0 8px" }}
              />
              <button
                className="button small primary"
                onClick={handleCustomApply}
                disabled={!customFrom || !customTo}
                style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="dash-message error" style={{ margin: 16 }}>
          <span>⚠</span> {error}
          <button className="button small ghost" onClick={() => fetchStats(range)}>
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && !stats && (
        <div className="empty-state" style={{ padding: "40px 20px" }}>
          <p>Loading email stats…</p>
        </div>
      )}

      {stats && (
        <>
          {/* Summary cards — row 1: traffic */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              padding: "16px 22px",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <SummaryCard label="Sent" value={stats.summary.totalSent.toLocaleString()} color="var(--accent-light)" />
            <SummaryCard label="Received" value={stats.summary.totalReceived.toLocaleString()} color="var(--green)" />
            <SummaryCard
              label="Total"
              value={(stats.summary.totalSent + stats.summary.totalReceived).toLocaleString()}
              color="var(--ink)"
            />
            <SummaryCard label="Data Transferred" value={formatBytes(stats.summary.totalSize)} color="var(--ink-soft)" />
          </div>

          {/* Summary cards — row 2: Mailcow storage stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              padding: "0 22px 16px",
            }}
          >
            <SummaryCard
              label="Messages Stored"
              value={stats.summary.totalStoredMessages.toLocaleString()}
              color="var(--accent)"
            />
            <SummaryCard
              label="Storage Used"
              value={formatBytes(stats.summary.totalStoredBytes)}
              color="var(--ink)"
            />
            <SummaryCard
              label="Active Mailboxes"
              value={`${stats.summary.activeMailboxes} / ${stats.summary.totalMailboxes}`}
              color="var(--green)"
            />
            <SummaryCard
              label="User Logins"
              value={stats.summary.totalLogins.toLocaleString()}
              color="var(--ink-soft)"
            />
          </div>

          {/* Chart */}
          <div style={{ padding: "16px 22px 22px", borderTop: "1px solid var(--line)" }}>
            {stats.daily.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "var(--ink-soft)",
                  fontSize: 14,
                }}
              >
                No email activity in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={stats.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(val) => formatDay(val, stats.range)}
                    tick={{ fontSize: 11, fill: "var(--ink-soft)" }}
                    axisLine={{ stroke: "var(--line)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--ink-soft)" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "var(--ink-soft)" }} />
                  <Bar
                    dataKey="sent"
                    name="Sent"
                    fill="var(--accent-light)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="received"
                    name="Received"
                    fill="var(--green)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke="var(--ink-soft)"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="4 4"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Per-mailbox breakdown (collapsible) */}
          {stats.mailboxes && stats.mailboxes.length > 0 && (
            <div style={{ borderTop: "1px solid var(--line)", padding: "12px 22px" }}>
              <button
                onClick={() => setShowMailboxes(!showMailboxes)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink-soft)",
                  padding: "4px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {showMailboxes ? "▼" : "▶"} Per-Mailbox Storage ({stats.mailboxes.length} mailboxes)
              </button>
              {showMailboxes && (
                <div style={{ marginTop: 8, maxHeight: 240, overflowY: "auto" }}>
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ color: "var(--ink-soft)", borderBottom: "1px solid var(--line)" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>Mailbox</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>Messages</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>Storage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.mailboxes
                        .filter((m) => m.storedMessages > 0)
                        .map((m) => (
                          <tr key={m.email} style={{ borderBottom: "1px solid var(--line)" }}>
                            <td style={{ padding: "6px 8px", color: "var(--ink)" }}>{m.email}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--ink)" }}>
                              {m.storedMessages.toLocaleString()}
                            </td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--ink-soft)" }}>
                              {formatBytes(m.storedBytes)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Summary Card ─────────────────────────────────────────

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 2,
        padding: "12px 14px",
        borderRadius: 10,
        background: "var(--panel)",
        border: "1px solid var(--panel-border)",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <strong style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1 }}>
        {value}
      </strong>
    </div>
  );
}
