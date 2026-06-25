import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateData } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import { log, logRequest, logResponse, parseJsonBody, requireCsrf } from "@/lib/middleware";

export const runtime = "nodejs";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@qrzmail.com";

type UpgradeBody = {
  plan?: string;
};

const VALID_PLANS = ["starter", "business"] as const;

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter ($9/month)",
  business: "Business ($29/month)",
};

export async function POST(request: Request) {
  const startTime = Date.now();
  logRequest(request, startTime);

  const user = await getCurrentUser();
  if (!user) {
    const response = NextResponse.json({ error: "Login required." }, { status: 401 });
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
  const parsed = await parseJsonBody<UpgradeBody>(request);
  if (!parsed.ok) {
    logResponse(request, parsed.error, startTime);
    return parsed.error;
  }
  const body = parsed.data;

  const plan = body.plan ?? "";

  if (!VALID_PLANS.includes(plan as typeof VALID_PLANS[number])) {
    const response = NextResponse.json(
      { error: "Invalid plan. Choose 'starter' or 'business'." },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  // Update subscription to "pending" in the database
  updateData((data) => {
    const existing = data.users.find((u) => u.id === user.id);
    if (existing) {
      existing.subscription = "pending";
    }
  });

  // Send notification email to admin
  const planLabel = PLAN_LABELS[plan] ?? plan;
  const subject = `[QRZMail] Upgrade Request: ${user.email} → ${planLabel}`;
  const text = [
    `A user has requested an upgrade.`,
    ``,
    `User:    ${user.name} <${user.email}>`,
    `Plan:    ${planLabel}`,
    `Status:  Pending verification`,
    ``,
    `Please review and approve this upgrade by updating the user's`,
    `subscription status in the admin panel.`,
    ``,
    `Admin panel: https://qrzmail.com/admin/login`,
  ].join("\n");

  try {
    await sendEmail({ to: ADMIN_EMAIL, subject, text });
    log("info", "Upgrade notification sent", { email: user.email, plan });
  } catch (err) {
    // Email failure is non-fatal — the pending status is already saved
    log("error", "Failed to send upgrade notification email", { error: String(err) });
  }

  const response = NextResponse.json({
    message: `Upgrade to ${planLabel} requested. An admin will verify your request shortly.`,
    subscription: "pending",
  });
  logResponse(request, response, startTime);
  return response;
}
