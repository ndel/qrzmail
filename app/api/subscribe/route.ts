import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateData } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import { log, logRequest, logResponse, parseJsonBody, requireCsrf } from "@/lib/middleware";

export const runtime = "nodejs";

const ADMIN_EMAIL = "admin@qrzmail.com";

type SubscribeBody = {
  plan?: "starter" | "business" | "business-pro";
};

export async function POST(request: Request) {
  const startTime = Date.now();
  logRequest(request, startTime);

  const user = await getCurrentUser();

  if (!user) {
    const response = NextResponse.json({ error: "You must be logged in to subscribe." }, { status: 401 });
    logResponse(request, response, startTime);
    return response;
  }

  if (user.subscription === "paid") {
    const response = NextResponse.json({ error: "You are already on a paid plan." }, { status: 400 });
    logResponse(request, response, startTime);
    return response;
  }

  if (user.subscription === "pending") {
    const response = NextResponse.json({ error: "Your subscription request is already pending. We'll be in touch soon." }, { status: 400 });
    logResponse(request, response, startTime);
    return response;
  }

  // CSRF check
  const csrfError = requireCsrf(request);
  if (csrfError) {
    logResponse(request, csrfError, startTime);
    return csrfError;
  }

  // Parse body with size limit
  const parsed = await parseJsonBody<SubscribeBody>(request);
  if (!parsed.ok) {
    logResponse(request, parsed.error, startTime);
    return parsed.error;
  }
  const body = parsed.data;

  const plan = body.plan || "starter";

  // Mark user as pending
  await updateData((data) => {
    const existing = data.users.find((u) => u.id === user.id);
    if (existing) {
      existing.subscription = "pending";
    }
  });

  // Send notification email to admin
  const planLabels: Record<string, string> = {
    starter: "Starter",
    business: "Business",
    "business-pro": "Business Pro",
  };
  const planLabel = planLabels[plan] ?? "Starter";
  const subject = `[QRZMail] New Subscription Request: ${planLabel} — ${user.email}`;
  const text = [
    `New subscription request received.`,
    ``,
    `Plan: ${planLabel}`,
    `User: ${user.name} <${user.email}>`,
    `Account ID: ${user.id}`,
    `Registered: ${user.createdAt}`,
    ``,
    `To activate:`,
    `1. Process payment manually (send invoice via email)`,
    `2. Update the user's subscription status to "paid" in the data store`,
    `3. Notify the user once activated`,
    ``,
    `Action required: Reply to this email or contact the user directly at ${user.email}`,
  ].join("\n");

  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject,
      text,
    });
  } catch (err) {
    log("error", "Failed to send subscription notification email", { error: String(err) });
    // Rollback the subscription status
    await updateData((data) => {
      const existing = data.users.find((u) => u.id === user.id);
      if (existing) {
        existing.subscription = "free";
      }
    });
    const response = NextResponse.json({ error: "Failed to send subscription request. Please try again later." }, { status: 500 });
    logResponse(request, response, startTime);
    return response;
  }

  log("info", "Subscription request submitted", { email: user.email, plan });

  const response = NextResponse.json({
    success: true,
    message: `Your ${planLabel} subscription request has been submitted. We'll review it and send an invoice to your email within 1-2 business days.`,
  });
  logResponse(request, response, startTime);
  return response;
}
