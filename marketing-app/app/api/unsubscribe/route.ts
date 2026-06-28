import { NextRequest, NextResponse } from "next/server";
import { processUnsubscribe } from "@/lib/tracking";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing unsubscribe token", { status: 400 });
  }

  const success = processUnsubscribe(token);
  if (!success) {
    return new NextResponse("Invalid or expired unsubscribe link", { status: 404 });
  }

  // Return a simple confirmation page
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Unsubscribed - QRZMail Marketing</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8f9fc; color: #0f172a; }
  .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); text-align: center; max-width: 400px; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  p { color: #475569; }
</style>
</head>
<body>
<div class="card">
  <h1>✅ Unsubscribed</h1>
  <p>You have been successfully unsubscribed from this mailing list. You will no longer receive emails from this sender.</p>
</div>
</body>
</html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
