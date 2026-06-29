import type { Metadata } from "next";
import Sidebar from "./sidebar";

export const metadata: Metadata = {
  title: "Marketing - QRZMail",
  description: "Email marketing campaigns",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-layout">
      <Sidebar />
      {children}
      <style>{`
        .marketing-layout {
          display: flex;
          min-height: 100vh;
          background: var(--bg);
        }
        .marketing-content {
          flex: 1;
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }
        .page-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .page-heading h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--ink);
          margin: 0;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          text-decoration: none;
          transition: all 0.15s;
        }
        .btn-primary {
          background: var(--accent);
          color: white;
        }
        .btn-primary:hover { background: var(--accent-dark); }
        .btn-secondary {
          background: var(--panel);
          color: var(--ink-soft);
          border: 1px solid var(--panel-border);
        }
        .btn-secondary:hover { background: rgba(255,255,255,0.08); }
        .btn-danger {
          background: var(--danger);
          color: white;
        }
        .btn-danger:hover { background: #dc2626; }
        .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
        .card {
          background: var(--panel);
          border: 1px solid var(--panel-border);
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          padding: 1.5rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--ink-soft);
          margin-bottom: 0.35rem;
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--panel-border);
          border-radius: 6px;
          font-size: 0.9rem;
          color: var(--ink);
          background: var(--bg2);
          box-sizing: border-box;
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .form-group textarea { min-height: 100px; resize: vertical; }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .data-table th {
          text-align: left;
          padding: 0.6rem 0.75rem;
          font-weight: 600;
          color: var(--ink-soft);
          border-bottom: 2px solid var(--line);
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .data-table td {
          padding: 0.6rem 0.75rem;
          border-bottom: 1px solid var(--line);
          color: var(--ink);
        }
        .data-table tr:hover td { background: var(--panel); }
        .table-container { overflow-x: auto; }
        .badge {
          display: inline-block;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .badge-active { background: rgba(34,197,94,0.15); color: var(--green); }
        .badge-draft { background: var(--panel); color: var(--ink-soft); }
        .badge-sending { background: rgba(59,130,246,0.15); color: var(--accent-light); }
        .badge-sent { background: rgba(59,130,246,0.15); color: var(--accent-light); }
        .badge-completed { background: rgba(34,197,94,0.15); color: var(--green); }
        .badge-failed { background: rgba(248,113,113,0.15); color: var(--danger); }
        .badge-paused { background: rgba(250,204,21,0.15); color: #eab308; }
        .badge-scheduled { background: rgba(168,85,247,0.15); color: #a855f7; }
        .badge-bounced { background: rgba(248,113,113,0.15); color: var(--danger); }
        .badge-unsubscribed { background: rgba(248,113,113,0.15); color: var(--danger); }
        .badge-pending { background: var(--panel); color: var(--ink-soft); }
        .badge-opened { background: rgba(34,197,94,0.15); color: var(--green); }
        .badge-clicked { background: rgba(59,130,246,0.15); color: var(--accent-light); }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: var(--panel);
          border: 1px solid var(--panel-border);
          border-radius: 8px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .stat-card .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--ink);
        }
        .stat-card .stat-label {
          font-size: 0.8rem;
          color: var(--ink-soft);
          margin-top: 0.25rem;
        }
        .inline-form {
          display: flex;
          gap: 0.75rem;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        .inline-form .form-group { margin-bottom: 0; }
        .filter-select {
          padding: 0.4rem 0.75rem;
          border: 1px solid var(--panel-border);
          border-radius: 6px;
          font-size: 0.85rem;
          background: var(--bg2);
          color: var(--ink);
        }
        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--ink-soft);
        }
        .empty-state p { font-size: 1rem; margin-bottom: 1rem; }
        .action-card {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--panel);
          border: 1px solid var(--panel-border);
          border-radius: 8px;
          text-decoration: none;
          color: var(--ink);
          font-size: 0.9rem;
          transition: all 0.15s;
        }
        .action-card:hover { background: rgba(255,255,255,0.08); border-color: var(--ink-soft); }
        .filters {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .section { margin-bottom: 2rem; }
        .section-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 1rem;
        }
        .preview-body {
          border: 1px solid var(--panel-border);
          border-radius: 8px;
          padding: 1rem;
          background: var(--bg2);
          min-height: 200px;
        }
        .preview-body iframe {
          width: 100%;
          min-height: 300px;
          border: none;
        }
        .inline-form .btn { align-self: flex-end; }
      `}</style>
    </div>
  );
}
