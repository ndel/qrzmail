import { NextRequest, NextResponse } from "next/server";
import { recordOpen } from "@/lib/marketing/tracking";

// 1x1 transparent GIF pixel
const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest) {
  const tid = req.nextUrl.searchParams.get("tid");
  if (tid) {
    try { recordOpen(tid); } catch {}
  }

  return new NextResponse(PIXEL_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
