"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const VARIABLES = [
  { label: "Name", value: "{{name}}" },
  { label: "Email", value: "{{email}}" },
  { label: "Company", value: "{{company}}" },
  { label: "First Name", value: "{{first_name}}" },
];

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [plainContent, setPlainContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/marketing/templates/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setName(data.name);
        setSubject(data.subject);
        setHtmlContent(data.html_content);
        setPlainContent(data.plain_content || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const insertVar = (v: string, target: "subject" | "html") => {
    if (target === "subject") setSubject((prev) => prev + v);
    else setHtmlContent((prev) => prev + v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/marketing/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject, html_content: htmlContent, plain_content: plainContent || null }),
    });
    if (res.ok) router.push("/marketing/templates");
  };

  if (loading) return <main className="marketing-content"><p>Loading...</p></main>;

  return (
    <main className="marketing-content">
      <div className="panel-header-row" style={{ marginBottom: "28px" }}>
        <div className="panel-header-left">
          <div className="panel-icon" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))", border: "1px solid rgba(34,197,94,0.15)", color: "#4ade80" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="panel-header-text">
            <h1>Edit Template</h1>
            <p>Modify your email template</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>Template Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>
            Subject Line
            <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#94a3b8" }}>
              {VARIABLES.map((v) => (
                <button key={v.value} type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: "0.25rem" }} onClick={() => insertVar(v.value, "subject")}>{v.label}</button>
              ))}
            </span>
          </label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>
            HTML Content
            <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#94a3b8" }}>
              {VARIABLES.map((v) => (
                <button key={v.value} type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: "0.25rem" }} onClick={() => insertVar(v.value, "html")}>{v.label}</button>
              ))}
            </span>
          </label>
          <textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} required style={{ minHeight: "200px", fontFamily: "monospace", fontSize: "0.85rem" }} />
        </div>
        <div className="form-group">
          <label>Plain Text Content (optional)</label>
          <textarea value={plainContent} onChange={(e) => setPlainContent(e.target.value)} style={{ minHeight: "100px", fontFamily: "monospace", fontSize: "0.85rem" }} />
        </div>
        {htmlContent && (
          <div className="form-group">
            <label>Preview</label>
            <div className="preview-body">
              <iframe srcDoc={htmlContent} title="Preview" />
            </div>
          </div>
        )}
        <button type="submit" className="btn btn-primary">Save Changes</button>
      </form>
    </main>
  );
}
