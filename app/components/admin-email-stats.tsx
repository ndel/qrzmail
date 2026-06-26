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
  };
  daily: DailyStat[];
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
        <div
          className="dash-message error"
          style={{ margin: 16 }}
        >
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
          {/* Summary cards */}
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
            <SummaryCard label="Total" value={(stats.summary.totalSent + stats.summary.totalReceived).toLocaleString()} color="var(--ink)" />
            <SummaryCard label="Data Transferred" value={formatBytes(stats.summary.totalSize)} color="var(--ink-soft)" />
          </div>

          {/* Chart */}
          <div style={{ padding: "16px 22px 22px" }}>
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
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "var(--ink-soft)" }}
                  />
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
