"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../sidebar";

const AVAILABLE_VARS = ["{{name}}", "{{first_name}}", "{{email}}", "{{company}}", "{{phone}}"];

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [plainContent, setPlainContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    fetch(`/marketing/api/templates/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { router.push("/templates"); return; }
        setName(data.name);
        setSubject(data.subject);
        setHtmlContent(data.html_content);
        setPlainContent(data.plain_content || "");
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const insertVar = (v: string, target: "subject" | "html") => {
    if (target === "subject") setSubject((prev) => prev + v);
    else setHtmlContent((prev) => prev + v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/marketing/api/templates/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          subject: subject.trim(),
          html_content: htmlContent,
          plain_content: plainContent.trim() || null,
          variables: AVAILABLE_VARS,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      router.push("/templates");
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
          <div className="loading-container"><div className="spinner" /><p>Loading template...</p></div>
        </main>
      </div>
    );
  }

  return (
    <div className="marketing-layout">
      <Sidebar />
      <main className="marketing-content">
        <div className="page">
          <div className="page-header">
            <div>
              <h1>Edit Template</h1>
              <p className="subtitle">Update your email template</p>
            </div>
          </div>

          {error && <div className="warning" style={{ marginBottom: "1rem" }}>{error}</div>}

          <form onSubmit={handleSubmit} className="editor-form">
            <div className="form-group">
              <label>Template Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Subject Line</label>
              <div className="variable-pills">
                {AVAILABLE_VARS.map((v) => (
                  <span key={v} className="pill" onClick={() => insertVar(v, "subject")}>{v}</span>
                ))}
              </div>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>HTML Content</label>
              <div className="variable-pills">
                {AVAILABLE_VARS.map((v) => (
                  <span key={v} className="pill" onClick={() => insertVar(v, "html")}>{v}</span>
                ))}
              </div>
              <textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} rows={16} required />
            </div>

            <div className="form-group">
              <label>Plain Text Content (optional)</label>
              <textarea value={plainContent} onChange={(e) => setPlainContent(e.target.value)} rows={6} />
            </div>

            <div className="form-actions" style={{ justifyContent: "space-between" }}>
              <div>
                <button type="button" className="btn btn-secondary" onClick={() => setPreview(!preview)}>
                  {preview ? "Hide Preview" : "Preview"}
                </button>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>

          {preview && (
            <div className="preview-container">
              <div className="preview-header">Preview: {subject.replace(/\{\{(\w+)\}\}/g, "[$1]")}</div>
              <div className="preview-body">
                <iframe
                  srcDoc={htmlContent
                    .replace(/\{\{name\}\}/g, "John Doe")
                    .replace(/\{\{first_name\}\}/g, "John")
                    .replace(/\{\{email\}\}/g, "john@example.com")
                    .replace(/\{\{company\}\}/g, "Acme Inc")
                    .replace(/\{\{phone\}\}/g, "+1-555-0123")
                  }
                  style={{ width: "100%", height: "300px", border: "none" }}
                  title="Email Preview"
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
