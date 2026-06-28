"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body: any = { email: email.trim(), password };
      if (isRegister) body.name = name.trim();

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailInvalid = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (input.validity.patternMismatch || input.validity.typeMismatch) {
      input.setCustomValidity("Please enter a valid email address (e.g., user@example.com)");
    } else if (input.validity.valueMissing) {
      input.setCustomValidity("Email is required");
    }
  };

  const handlePasswordInvalid = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (input.validity.tooShort) {
      input.setCustomValidity("Password must be at least 6 characters");
    } else if (input.validity.valueMissing) {
      input.setCustomValidity("Password is required");
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    e.currentTarget.setCustomValidity(""); // Clear custom validity on change
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    e.currentTarget.setCustomValidity(""); // Clear custom validity on change
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon">📬</span>
          <h1>QRZMail Marketing</h1>
          <p className="login-subtitle">
            {isRegister ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {isRegister && (
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  e.currentTarget.setCustomValidity("");
                }}
                onInvalid={(e) => {
                  if (e.currentTarget.validity.valueMissing) {
                    e.currentTarget.setCustomValidity("Name is required");
                  }
                }}
                placeholder="Your name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="text"
              inputMode="email"
              value={email}
              onChange={handleEmailChange}
              onInvalid={handleEmailInvalid}
              placeholder="you@example.com"
              pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
              title="Please enter a valid email address (e.g., user@example.com)"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              onInvalid={handlePasswordInvalid}
              placeholder={isRegister ? "At least 6 characters" : "Your password"}
              required
              minLength={isRegister ? 6 : 1}
            />
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="login-footer">
          <button
            className="btn-link"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
          >
            {isRegister
              ? "Already have an account? Sign in"
              : "Don't have an account? Register"}
          </button>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .login-card {
          background: white;
          border-radius: 12px;
          padding: 2.5rem;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
          border: 1px solid #e5e7eb;
        }
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .login-icon {
          font-size: 2.5rem;
          display: block;
          margin-bottom: 0.75rem;
        }
        .login-header h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.25rem;
        }
        .login-subtitle {
          color: #64748b;
          font-size: 0.9rem;
          margin: 0;
        }
        .login-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 6px;
          font-size: 0.85rem;
          margin-bottom: 1rem;
          text-align: center;
        }
        .login-form .form-group {
          margin-bottom: 1.25rem;
        }
        .login-form label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.35rem;
        }
        .login-form input {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9rem;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .login-form input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .login-btn {
          width: 100%;
          justify-content: center;
          padding: 0.75rem;
          font-size: 0.95rem;
          margin-top: 0.5rem;
        }
        .login-footer {
          text-align: center;
          margin-top: 1.5rem;
        }
        .btn-link {
          background: none;
          border: none;
          color: #2563eb;
          cursor: pointer;
          font-size: 0.85rem;
          padding: 0;
          text-decoration: none;
        }
        .btn-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
