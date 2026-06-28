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
          background: #f8f9fc;
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
          color: #0f172a;
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
          background: #3b82f6;
          color: white;
        }
        .btn-primary:hover { background: #2563eb; }
        .btn-secondary {
          background: #e2e8f0;
          color: #334155;
        }
        .btn-secondary:hover { background: #cbd5e1; }
        .btn-danger {
          background: #ef4444;
          color: white;
        }
        .btn-danger:hover { background: #dc2626; }
        .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
        .card {
          background: white;
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
          color: #334155;
          margin-bottom: 0.35rem;
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.9rem;
          color: #0f172a;
          background: white;
          box-sizing: border-box;
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
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
          color: #64748b;
          border-bottom: 2px solid #e2e8f0;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .data-table td {
          padding: 0.6rem 0.75rem;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
        }
        .data-table tr:hover td { background: #f8fafc; }
        .table-container { overflow-x: auto; }
        .badge {
          display: inline-block;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .badge-active { background: #dcfce7; color: #166534; }
        .badge-draft { background: #f1f5f9; color: #475569; }
        .badge-sending { background: #dbeafe; color: #1e40af; }
        .badge-sent { background: #dbeafe; color: #1e40af; }
        .badge-completed { background: #dcfce7; color: #166534; }
        .badge-failed { background: #fef2f2; color: #991b1b; }
        .badge-paused { background: #fef9c3; color: #854d0e; }
        .badge-scheduled { background: #f3e8ff; color: #6b21a8; }
        .badge-bounced { background: #fef2f2; color: #991b1b; }
        .badge-unsubscribed { background: #fef2f2; color: #991b1b; }
        .badge-pending { background: #f1f5f9; color: #475569; }
        .badge-opened { background: #dcfce7; color: #166534; }
        .badge-clicked { background: #dbeafe; color: #1e40af; }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: white;
          border-radius: 8px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .stat-card .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #0f172a;
        }
        .stat-card .stat-label {
          font-size: 0.8rem;
          color: #64748b;
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
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.85rem;
          background: white;
        }
        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #94a3b8;
        }
        .empty-state p { font-size: 1rem; margin-bottom: 1rem; }
        .action-card {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          text-decoration: none;
          color: #334155;
          font-size: 0.9rem;
          transition: all 0.15s;
        }
        .action-card:hover { background: #f1f5f9; border-color: #cbd5e1; }
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
          color: #0f172a;
          margin-bottom: 1rem;
        }
        .preview-body {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
          background: white;
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
