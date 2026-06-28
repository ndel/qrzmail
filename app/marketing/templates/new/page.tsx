"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const VARIABLES = [
  { label: "Name", value: "{{name}}" },
  { label: "Email", value: "{{email}}" },
  { label: "Company", value: "{{company}}" },
  { label: "First Name", value: "{{first_name}}" },
];

export default function NewTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [plainContent, setPlainContent] = useState("");

  const insertVar = (v: string, target: "subject" | "html") => {
    if (target === "subject") setSubject((prev) => prev + v);
    else setHtmlContent((prev) => prev + v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/marketing/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject, html_content: htmlContent, plain_content: plainContent || null }),
    });
    if (res.ok) router.push("/marketing/templates");
  };

  return (
    <main className="marketing-content">
      <div className="page-heading">
        <h1>New Template</h1>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>Template Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Weekly Newsletter" />
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
          <input value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="Hello {{name}}!" />
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
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            required
            placeholder={`<h1>Hello {{name}}!</h1>\n<p>Welcome to our newsletter.</p>`}
            style={{ minHeight: "200px", fontFamily: "monospace", fontSize: "0.85rem" }}
          />
        </div>
        <div className="form-group">
          <label>Plain Text Content (optional, for fallback)</label>
          <textarea
            value={plainContent}
            onChange={(e) => setPlainContent(e.target.value)}
            placeholder="Hello {{name}}! Welcome to our newsletter."
            style={{ minHeight: "100px", fontFamily: "monospace", fontSize: "0.85rem" }}
          />
        </div>
        {htmlContent && (
          <div className="form-group">
            <label>Preview</label>
            <div className="preview-body">
              <iframe srcDoc={htmlContent} title="Preview" />
            </div>
          </div>
        )}
        <button type="submit" className="btn btn-primary">Create Template</button>
      </form>
    </main>
  );
}
