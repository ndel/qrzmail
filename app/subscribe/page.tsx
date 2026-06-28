"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type State =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

type PlanId = "starter" | "business" | "business-pro";

const PLAN_INFO: Record<PlanId, { name: string; monthly: number; features: string[] }> = {
  starter: {
    name: "Starter",
    monthly: 4.99,
    features: [
      "Up to 3 custom domains",
      "Up to 10 mailboxes",
      "10 GB storage per mailbox",
      "Unlimited aliases",
      "Catch-all & forwarding",
      "Priority email support",
    ],
  },
  business: {
    name: "Business",
    monthly: 12.99,
    features: [
      "Up to 10 custom domains",
      "Up to 25 mailboxes",
      "25 GB storage per mailbox",
      "Shared mailboxes",
      "Catch-all & forwarding",
      "Priority support",
      "Migration assistance",
    ],
  },
  "business-pro": {
    name: "Business Pro",
    monthly: 29.99,
    features: [
      "Unlimited custom domains",
      "Up to 100 mailboxes",
      "50 GB storage per mailbox",
      "Shared mailboxes",
      "Unlimited aliases",
      "API access",
      "Migration assistance",
      "Priority support",
    ],
  },
};

export default function SubscribePage() {
  const [state, setState] = useState<State>({ type: "idle" });
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("starter");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userSubscription, setUserSubscription] = useState<string | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  // Read plan from query param and check auth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    const successParam = params.get("success");
    const urlPlan = planParam && planParam in PLAN_INFO ? (planParam as PlanId) : null;

    if (urlPlan) {
      setSelectedPlan(urlPlan);
    }

    // If redirected here after successful direct submission from pricing page
    if (successParam === "1") {
      const successPlan = urlPlan ?? selectedPlan;
      setState({
        type: "success",
        message: `Your ${PLAN_INFO[successPlan].name} subscription request has been submitted. We'll review it and send an invoice to your email within 1-2 business days.`,
      });
      return;
    }

    fetch("/api/account/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (data.user) {
          setUserEmail(data.user.email);
          setUserSubscription(data.user.subscription);
        }
      })
      .catch(() => {});
  }, [selectedPlan]);

  // Auto-submit if user is logged in, on a free plan, and a plan was specified in the URL
  useEffect(() => {
    if (
      !autoSubmitted &&
      userEmail &&
      (userSubscription === "free" || userSubscription === null) &&
      selectedPlan &&
      state.type === "idle"
    ) {
      const params = new URLSearchParams(window.location.search);
      const planParam = params.get("plan");
      if (planParam && planParam in PLAN_INFO) {
        setAutoSubmitted(true);
        handleSubscribeDirect(planParam as PlanId);
      }
    }
  }, [autoSubmitted, userEmail, userSubscription, selectedPlan, state.type]);

  async function handleSubscribeDirect(plan: PlanId) {
    setState({ type: "loading" });

    const csrfToken = sessionStorage.getItem("csrfToken") ?? "";

    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ plan }),
    });

    const result = await response.json();

    if (!response.ok) {
      setState({ type: "error", message: result.error ?? "Subscription request failed." });
      return;
    }

    setState({ type: "success", message: result.message });
  }

  async function handleSubscribe(e: FormEvent) {
    e.preventDefault();
    await handleSubscribeDirect(selectedPlan);
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://qrzmail.com" },
      { "@type": "ListItem", position: 2, name: "Subscribe", item: "https://qrzmail.com/subscribe" },
    ],
  };

  const plan = PLAN_INFO[selectedPlan];

  return (
    <div className="form-wrap">
      <title>Subscribe – Upgrade Your QRZMail Plan | QRZMail</title>
      <meta name="description" content="Upgrade your QRZMail domain email hosting plan. Get more mailboxes, more storage, and priority support for your business." />
      <meta name="robots" content="noindex, follow" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {state.type === "success" ? (
        <div className="panel form-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
          <h1>Request Submitted!</h1>
          <div className="message success" style={{ marginTop: "16px", textAlign: "left" }}>
            {state.message}
          </div>
          <p style={{ marginTop: "20px", fontSize: "14px", color: "var(--ink-soft)", lineHeight: "1.6" }}>
            We&apos;ll review your request and send an invoice with payment instructions
            to <strong>{userEmail}</strong> within 1-2 business days.
            Once payment is confirmed, your plan will be activated.
          </p>
          <Link href="/domains" className="button primary full" style={{ marginTop: "24px" }}>
            Back to Dashboard →
          </Link>
        </div>
      ) : (
        <form className="panel form-card" onSubmit={handleSubscribe}>
          <h1>Upgrade Your Plan</h1>
          <p>Get more mailboxes, more storage, and priority support.</p>

          {state.type === "error" && (
            <div className="message error">{state.message}</div>
          )}

          {!userEmail && (
            <div className="message" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", color: "#fcd34d" }}>
              Please <Link href={`/domains/login?redirect=/subscribe&plan=${selectedPlan}`} className="text-link">sign in to your domain account</Link> to subscribe.
            </div>
          )}

          {userSubscription === "paid" && (
            <div className="message success">You are already on a paid plan. Thank you for your support!</div>
          )}

          {userSubscription === "pending" && (
            <div className="message" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", color: "#fcd34d" }}>
              Your subscription request is pending. We&apos;ll be in touch soon.
            </div>
          )}

          {state.type === "loading" && autoSubmitted && (
            <div className="message" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa" }}>
              Submitting your {plan.name} subscription request...
            </div>
          )}

          {/* Plan Selection */}
          <div style={{ display: "grid", gap: "16px", marginTop: "24px" }}>
            {(Object.keys(PLAN_INFO) as PlanId[]).map((planId) => {
              const p = PLAN_INFO[planId];
              const isSelected = selectedPlan === planId;
              const borderColor = isSelected
                ? planId === "business" ? "var(--green)" : "var(--accent)"
                : "var(--panel-border)";
              const bgColor = isSelected
                ? planId === "business" ? "rgba(34,197,94,0.08)" : "rgba(59,130,246,0.08)"
                : "var(--panel)";
              const priceColor = planId === "business" ? "var(--green)" : "var(--accent-light)";

              return (
                <label
                  key={planId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: "16px",
                    padding: "20px",
                    border: `2px solid ${borderColor}`,
                    borderRadius: "14px",
                    background: bgColor,
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                    alignItems: "start",
                  }}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={planId}
                    checked={isSelected}
                    onChange={() => setSelectedPlan(planId)}
                    style={{ marginTop: "4px", accentColor: planId === "business" ? "var(--green)" : "var(--accent)" }}
                  />
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <strong style={{ fontSize: "18px" }}>{p.name}</strong>
                      <span style={{ fontSize: "22px", fontWeight: "800", color: priceColor }}>
                        ${p.monthly.toFixed(2)}<span style={{ fontSize: "14px", fontWeight: "500", color: "var(--ink-soft)" }}>/mo</span>
                      </span>
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px", fontSize: "14px", color: "var(--ink-soft)" }}>
                      {p.features.map((f) => (
                        <li key={f} style={{ display: "flex", gap: "8px", alignItems: "center" }}>✓ {f}</li>
                      ))}
                    </ul>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="fine-print" style={{ marginTop: "16px", lineHeight: "1.5" }}>
            <strong>How it works:</strong> After submitting, we&apos;ll send an invoice to your email.
            Payment is processed manually via bank transfer or payment link.
            Once confirmed, your plan is activated within 24 hours.
          </div>

          <button
            className="button primary full"
            disabled={state.type === "loading" || !userEmail || userSubscription === "paid" || userSubscription === "pending"}
            style={{ marginTop: "20px" }}
          >
            {state.type === "loading"
              ? "Submitting..."
              : userSubscription === "paid"
                ? "Already on Paid Plan"
                : userSubscription === "pending"
                  ? "Request Pending"
                  : `Subscribe to ${plan.name} →`}
          </button>

          <Link href="/domains" className="button full" style={{ marginTop: "12px" }}>
            Back to Dashboard
          </Link>
        </form>
      )}
    </div>
  );
}
